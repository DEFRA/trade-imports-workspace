#!/bin/bash
# Strict parser for the EUDP Import Notification Capability Map.
#
# The map is the contract. Every capability row must be shaped:
#
#   | <CODE> | STATUS: <VALUE> | <Capability cell> | ...
#
# where <CODE> is CAP-0.4 / CAP-H.3 / COMMON-CAP-01.2 (CORE- also tolerated),
# the Status cell is either empty or "STATUS: <value>", and the Capability
# cell carries the name. Anything else is a violation, reported and refused —
# a tolerant parser would silently shrink the capability list, which is the
# bug this exists to prevent.
#
# Usage: ./extract-capabilities.sh <markdown-file> [--format list|tsv]
#
# Formats:
#   list  (default)  "CODE — Name [STATUS]" per conformant row.
#                    STRICT: any violation goes to stderr and exits 1
#                    without emitting a partial list.
#   tsv              "code<TAB>status<TAB>name<TAB>verdict<TAB>line" for
#                    every anchored row, conformant or not. Diagnostic:
#                    always exits 0. Used by check-capabilities.sh to show
#                    migration progress.

set -euo pipefail

MD_FILE=""
FORMAT="list"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --format)
            FORMAT="${2:?--format requires a value}"; shift 2
            ;;
        -h|--help)
            sed -n '2,26p' "$0"; exit 0
            ;;
        *)
            if [[ -z "$MD_FILE" ]]; then
                MD_FILE="$1"; shift
            else
                echo "Unknown argument: $1" >&2; exit 1
            fi
            ;;
    esac
done

if [[ -z "$MD_FILE" ]]; then
    echo "Usage: $0 <markdown-file> [--format list|tsv]" >&2
    exit 1
fi

if [[ ! -f "$MD_FILE" ]]; then
    echo "Error: file not found: $MD_FILE" >&2
    exit 1
fi

case "$FORMAT" in
    list|tsv) ;;
    *) echo "Error: --format must be 'list' or 'tsv', got: $FORMAT" >&2; exit 1 ;;
esac

FORMAT="$FORMAT" perl -0777 -e '
    my $format = $ENV{FORMAT};
    my $content = do { local $/; <> };

    # A capability code: CAP-0.4, CAP-H.3, COMMON-CAP-01.2, CORE-CAP-1.1.
    # Matching the numeric tail greedily makes the code self-delimiting —
    # it stops at the first character that is not a digit or a dot, so
    # "CAP-01.1STATUS: NOT STARTED" still yields "CAP-01.1" for reporting.
    my $CODE = qr/(?:COMMON-|CORE-)?CAP-(?:H|\d+)(?:\.\d+)*/;

    sub trim { my $s = shift // ""; $s =~ s/^\s+//; $s =~ s/\s+$//; return $s }

    # Squash a capability cell down to a display name. Names are the one
    # deliberately tolerant part: the source uses several bold runs for a
    # single name (CAP-02.5, COMMON-CAP-04.1), so join every run.
    sub cell_to_name {
        my $cell = shift;
        my @bold = ($cell =~ /\*\*(.+?)\*\*/gs);
        my $name = @bold ? join(" ", @bold) : $cell;
        $name =~ s/\*\*//g;
        $name =~ s/\s+/ /g;
        $name =~ s/\s+([:;,.])/$1/g;
        return trim($name);
    }

    my (@rows, @violations);

    # Anchor on any row whose first cell starts with a capability code. The
    # anchor is deliberately loose: it has to catch a malformed row in order
    # to reject it. Strictness lives in the cell rules below.
    while ($content =~ /^\|(?=[ \t]*$CODE)/gm) {
        my $start = $-[0];
        my $line  = 1 + (() = substr($content, 0, $start) =~ /\n/g);
        my $rest  = substr($content, $start);

        # Table cells never contain an unescaped pipe, so [^|]* spans a cell
        # even when sync-docs has broken it across physical lines.
        unless ($rest =~ /^\|([^|]*)\|([^|]*)\|([^|]*)\|/) {
            push @violations, { line => $line, code => "?", rule => "row-truncated",
                detail => "row has fewer than three cells" };
            next;
        }

        my ($id_cell, $status_cell, $name_cell) = ($1, $2, $3);
        my $id     = trim($id_cell);
        my $status = trim($status_cell);
        my @bad;

        my ($code) = $id =~ /^($CODE)/;
        $code //= "?";

        # Rule 1 — the ID cell holds the code and nothing else. A row can
        # carry more than one kind of leftover, so report each of them.
        if ($id !~ /^$CODE$/) {
            my $named = 0;
            if ($id =~ /STATUS\s*:/i) { push @bad, "id-has-status";   $named++ }
            if ($id =~ /EXTERNAL/i)   { push @bad, "id-has-external"; $named++ }
            push @bad, "id-not-clean" unless $named;
        }

        # Rule 2 — the Status cell is empty, or "STATUS: <value>".
        my $status_value = "";
        if ($status eq "") {
            # Legitimately blank: COMMON-CAP-00.1 has no status.
        } elsif ($status =~ /^STATUS\s*:\s*(.+)$/i) {
            $status_value = trim($1);
        } elsif ($status =~ /\*\*/) {
            # Cell 2 looks like the Capability cell, so the column is absent.
            push @bad, "status-column-missing";
        } else {
            push @bad, "status-cell-invalid";
        }

        # Rule 3 — the Capability cell yields a name.
        my $name = cell_to_name($name_cell);
        push @bad, "name-empty" if $name eq "";

        my $verdict = @bad ? join(",", @bad) : "ok";
        push @rows, { code => $code, status => $status_value, name => $name,
                      verdict => $verdict, line => $line };
        push @violations, { line => $line, code => $code, rule => $verdict,
                            detail => $id } if @bad;
    }

    if ($format eq "tsv") {
        for my $r (@rows) {
            my @f = ($r->{code}, $r->{status}, $r->{name}, $r->{verdict}, $r->{line});
            s/[\t\n]/ /g for @f;
            print join("\t", @f), "\n";
        }
        exit 0;
    }

    # list format is strict: refuse to emit a partial list.
    if (@violations) {
        print STDERR "Capability map is not canonical - refusing to emit a partial list.\n\n";
        for my $v (@violations) {
            printf STDERR "  line %-5s %-18s %s\n", $v->{line}, $v->{code}, $v->{rule};
            printf STDERR "  %-24s ID cell reads: %s\n", "", $v->{detail}
                if $v->{rule} =~ /^id-|status-column-missing/;
        }
        printf STDERR "\n%d of %d rows violate the canonical shape.\n",
            scalar(@violations), scalar(@rows);
        print STDERR "Run tools/ticket-creator/check-capabilities.sh for the full picture.\n";
        exit 1;
    }

    for my $r (@rows) {
        printf "%s — %s%s\n", $r->{code}, $r->{name},
            $r->{status} ne "" ? " [$r->{status}]" : "";
    }
' "$MD_FILE"
