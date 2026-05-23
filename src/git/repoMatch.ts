interface UriLike {
  readonly fsPath: string;
}

interface RepoLike<U extends UriLike> {
  readonly rootUri: U;
}

interface ApiLike<U extends UriLike, R extends RepoLike<U>> {
  readonly repositories: readonly R[];
  getRepository?(uri: U): R | null;
}

export const matchRepoByFsPath = <R extends RepoLike<UriLike>>(
  repositories: readonly R[],
  targetFsPath: string,
): R | undefined => {
  let best: R | undefined;
  for (const r of repositories) {
    const root = r.rootUri.fsPath;
    if (!targetFsPath.startsWith(root)) {
      continue;
    }
    if (best === undefined || root.length > best.rootUri.fsPath.length) {
      best = r;
    }
  }
  return best;
};

export const findRepoForUri = <U extends UriLike, R extends RepoLike<U>>(
  api: ApiLike<U, R>,
  uri: U,
): R | undefined => {
  if (api.getRepository !== undefined) {
    return api.getRepository(uri) ?? undefined;
  }
  return matchRepoByFsPath(api.repositories, uri.fsPath);
};
