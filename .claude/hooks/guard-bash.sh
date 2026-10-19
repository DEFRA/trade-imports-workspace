#!/bin/bash
# PreToolUse hook for the Bash tool. Reads the hook JSON on stdin. Prints a deny
# decision and exits 0, or exits 0 with no output to leave the command to the
# permission rules.

set -uf

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty')
[ -z "$CMD" ] && exit 0
[ -z "$CWD" ] && CWD=$PWD

deny() {
  jq -n --arg reason "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}

is_secret_path() {
  case "$1" in
    *.env|*.env.*|*/.npmrc|*/.netrc|*/.aws/*|*/.ssh/*|*/credentials|*/credentials.*|*/secrets|*/secrets.*) return 0 ;;
    *) return 1 ;;
  esac
}

READERS_THE_READ_DENY_MISSES=" jq grep egrep fgrep rg awk gawk file cut tr nl tac strings xxd od hexdump base64 less more cmp comm paste join column "

deny_chmod_secret_read_or_uncommitted_executable() {
  local seg first abs rabs top rel cmdname arg
  seg=$(printf '%s' "$1" | tr '\t' ' ' | tr -s ' ' \
    | sed -E 's/^[ `(]*//; s/^([A-Za-z_][A-Za-z0-9_]*=[^ ]* +)*//')
  while :; do
    case "$seg" in
      sudo\ *|command\ *|exec\ *|nohup\ *|time\ *|nice\ *|stdbuf\ *|setsid\ *) seg=${seg#* } ;;
      timeout\ *)
        seg=${seg#* }
        case "$seg" in [0-9]*\ *) seg=${seg#* } ;; esac ;;
      *) break ;;
    esac
  done
  first=$(printf '%s' "$seg" | awk '{print $1}')
  first=${first//\"/}; first=${first//\'/}
  [ -z "$first" ] && return 0
  cmdname=${first##*/}

  case "$cmdname" in
    chmod) deny "chmod is blocked by policy (write-then-execute guard). If the execute bit is genuinely needed, the user can run it themselves: ! chmod ..." ;;
  esac

  if printf '%s' "$READERS_THE_READ_DENY_MISSES" | grep -q " $cmdname "; then
    for arg in $seg; do
      arg=${arg//\"/}; arg=${arg//\'/}
      case "$arg" in -*) continue ;; esac
      if is_secret_path "$arg"; then
        deny "Blocked: reading a secret/credential path ($arg) via '$cmdname'. Secrets must not be read through ad-hoc Bash readers. If genuinely needed, the user runs it themselves."
      fi
    done
  fi

  case "$first" in
    */*) ;;
    *) return 0 ;;
  esac
  case "$first" in
    '~/'*)      abs="$HOME/${first#\~/}" ;;
    '$HOME/'*)  abs="$HOME/${first#\$HOME/}" ;;
    /*)         abs="$first" ;;
    *)          abs="$CWD/$first" ;;
  esac
  rabs=$(realpath "$abs" 2>/dev/null) && abs="$rabs"
  [ -f "$abs" ] || return 0
  case "$abs" in
    */node_modules/*) return 0 ;;
    /usr/*|/bin/*|/sbin/*|/opt/*|/System/*|/Library/*|/Applications/*) return 0 ;;
  esac
  top=$(git -C "$(dirname "$abs")" rev-parse --show-toplevel 2>/dev/null) \
    || deny "Blocked: '$first' is an executable outside any git repository. Executables must live committed in a repo; otherwise ask the user to run it."
  rel=${abs#"$top"/}
  git -C "$top" cat-file -e "HEAD:$rel" 2>/dev/null \
    || deny "Blocked: '$rel' is not committed in $top. New executables must be committed (a visible, reviewable step) before they can run."
  git -C "$top" diff --quiet HEAD -- "$rel" 2>/dev/null \
    || deny "Blocked: '$rel' differs from HEAD in $top. Commit the change before executing it."
}

if printf '%s' "$CMD" | grep -Eq -- '-(exec|execdir|ok|okdir)[[:space:]]+[^[:space:]]*chmod|xargs([[:space:]]+-[^[:space:]]+)*[[:space:]]+[^[:space:]]*chmod'; then
  deny "chmod (via find -exec / xargs) is blocked by policy (write-then-execute guard). If genuinely needed, the user runs it: ! chmod ..."
fi

if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+commit\b[^|;&]*--no-verify'; then
  deny "git commit --no-verify bypasses the pre-commit hooks. Fix what the hook flags rather than skipping it; if a hook is genuinely wrong, the user runs the commit themselves."
fi

if printf '%s' "$CMD" | grep -Eq 'git[[:space:]]+commit\b[^|;&]*--amend'; then
  if git -C "$CWD" branch -r --contains HEAD 2>/dev/null | grep -q .; then
    deny "git commit --amend rewrites HEAD, but HEAD is already on a remote branch (pushed). Make a NEW commit instead of amending published history."
  fi
fi

if printf '%s' "$CMD" | grep -Eq '/Users/[A-Za-z0-9._-]+/'; then
  deny "Use ~/ instead of a literal /Users/<user>/ path — the permission matcher treats them as different prefixes, so /Users/ triggers avoidable prompts."
fi

if printf '%s' "$CMD" | grep -Eq 'npx[[:space:]].*playwright[[:space:]]+test'; then
  deny "Use the project wrapper 'npm run test:docker-compose' rather than raw 'npx playwright test' — the wrapper does setup the raw invocation skips."
fi

if [[ "$CMD" =~ (^|[\;\&\|[:space:]])cd([[:space:]]|$)([^[:space:]]|[[:space:]])*git([[:space:]]+[^[:space:]]+)*[[:space:]]+push([[:space:]]|$) ]]; then
  deny "A 'cd' followed later by 'git push' in the same command runs the Sonar pre-push gate against the old directory, not the one being pushed, because the hook sees the working directory from before this command's own cd. It can skip the check or block the push over a failure in the wrong repo. Use 'git -C <path> push' in one command, or run 'cd <path>' and 'git push' as separate commands."
fi

CMD_UNQUOTED=$(printf '%s' "$CMD" | sed -E "s/'[^']*'|\"[^\"]*\"//g")
if printf '%s' "$CMD_UNQUOTED" | grep -Eq '&&'; then
  deny "Prefer one command per Bash call — this chains commands with '&&'. Split into separate Bash calls; the tool result already carries each command's exit code."
fi

TEST_RUN='(^|[[:space:](])(npm[[:space:]]([^|;]*[[:space:]])?(test|t|run[[:space:]]+test[^[:space:]|;]*)|([^[:space:]|;]*/)?vitest|([^[:space:]|;]*/)?playwright|([^[:space:]|;]*/)?mvnw?)'
PIPED_INTO_TRIMMER='([[:space:]][^|;]*)?\|&?[[:space:]]*(tail|head|grep|egrep|fgrep|rg)([[:space:]]|$)'
if printf '%s' "$CMD_UNQUOTED" | grep -Eq -- "$TEST_RUN$PIPED_INTO_TRIMMER"; then
  deny "Do not pipe a test run into tail, head or grep. The pipeline returns the trimmer's exit code, so a failed run reports exit 0, and the failure summary is cut off. Redirect the whole run to a file instead (for example: npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> test > ~/git/defra/trade-imports-workspace/workareas/<area>/test.log 2>&1), then read the file."
fi

COMMAND_SUBSTITUTION_BODIES=$(printf '%s' "$CMD" \
  | grep -oE '\$\([^()]*\)|`[^`]*`' \
  | sed -E 's/^\$\(//; s/\)$//; s/^`//; s/`$//')

COMMAND_AND_SUBSTITUTIONS=$(printf '%s\n%s' "$CMD" "$COMMAND_SUBSTITUTION_BODIES")
IFS=$'\n'
for line in $COMMAND_AND_SUBSTITUTIONS; do
  [ -z "$line" ] && continue
  for seg in $(printf '%s' "$line" | tr '|;&\n' '\n'); do
    [ -z "$seg" ] && continue
    deny_chmod_secret_read_or_uncommitted_executable "$seg"
  done
done

exit 0
