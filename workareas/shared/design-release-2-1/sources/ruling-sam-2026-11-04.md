# Ruling: Sam, 4 November 2026

On splitting the "What are you importing?" type question off the type question and templates theme (EUDPA-690),
after templates was de-prioritised:

> split off the what are you improting page from the templates stuff. handle it nicely in a new theme I think.

On the two type question rows held as deferred since the 12 October pause (the origin page's Back link, and Back
from a review Change link):

> if in doubt include them. all the rows go on one branch and dont merge it if you happen to finish. dont let the
> stuff forget links etc need to work in CDP as well as local docker stack and CI docker stack

1. Templates is de-prioritised. Its rows stay in `themes/type-question-and-templates`, parked, and are not built
   now. New.
2. The type question rows build in their own theme, `themes/type-question`, on one branch,
   `feat/EUDPA-690-type-question`, in every repo they touch. The two deferred rows are included as to do. New.
3. The branch is not merged when its last row lands. Sam merges it. New.
4. Every link, redirect and form hand-over between services works in all three environments: CDP, the local Docker
   stack and the CI Docker stack the pull request end-to-end runs use. Each one takes its address from the
   service's own configuration, as the existing links between services do, and never from a hard-coded host or
   port. New.
