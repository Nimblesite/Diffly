import type { MementoStore } from "../state";
import type { CommandDeps } from "./shared";
import { drillIntoFiles, pickRepoAndCommit, pickSideBAndResolve } from "./flow";

export const makeCompareTwoCommits =
  (deps: CommandDeps & { readonly state: MementoStore }) => async (): Promise<void> => {
    const start = await pickRepoAndCommit({
      runner: deps.runner,
      gitApi: deps.gitApi,
      output: deps.output,
    });
    if (start === undefined) {
      return;
    }
    const revB = await pickSideBAndResolve({
      repo: start.repo,
      output: deps.output,
    });
    if (!revB.ok) {
      return;
    }
    await drillIntoFiles({
      repo: start.repo,
      repoRoot: start.vsRepoRoot,
      revA: start.revA,
      revB: revB.value,
      state: deps.state,
      output: deps.output,
    });
  };
