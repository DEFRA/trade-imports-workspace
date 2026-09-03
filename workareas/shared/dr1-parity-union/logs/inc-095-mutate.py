import pathlib, os
p = pathlib.Path(os.path.expanduser("~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/commodities/consignment-details/remove/post-remove.js"))
s = p.read_text()
old = """const afterRemoval = (request, h, kept) =>
  h.redirect(
    kit.withChangeContext(
      request,
      pagePath(
        request.params.journeyId,
        kept.length > 0 ? page.slug : commoditiesPage.slug
      )
    )
  )"""
new = """const afterRemoval = (request, h, kept) =>
  h.redirect(
    kept.length > 0
      ? pagePath(request.params.journeyId, page.slug)
      : kit.withChangeContext(
          request,
          pagePath(request.params.journeyId, commoditiesPage.slug)
        )
  )"""
assert old in s
p.write_text(s.replace(old, new))
print("mutated")
