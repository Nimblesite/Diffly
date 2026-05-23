import { SCHEME, URI_AUTHORITIES } from '../constants';
import { type Result, ok, err } from '../result';
import type { DiffyAddressableRev, Sha } from '../git/types';

export type DiffyUriParseError =
  | { readonly kind: 'invalidScheme'; readonly got: string }
  | { readonly kind: 'invalidAuthority'; readonly got: string }
  | { readonly kind: 'missingSha' }
  | { readonly kind: 'emptyPath' }
  | { readonly kind: 'badEncoding'; readonly raw: string }
  | { readonly kind: 'malformed'; readonly reason: string };

export interface DiffyUriComponents {
  readonly rev: DiffyAddressableRev;
  readonly path: string;
}

const SCHEME_SEP = '://';
const PATH_SEP = '/';

const encodePath = (path: string): string =>
  path.split(PATH_SEP).map(encodeURIComponent).join(PATH_SEP);

const decodePath = (encoded: string): Result<string, DiffyUriParseError> => {
  try {
    return ok(encoded.split(PATH_SEP).map(decodeURIComponent).join(PATH_SEP));
  } catch {
    return err({ kind: 'badEncoding', raw: encoded });
  }
};

export const buildDiffyUri = (rev: DiffyAddressableRev, path: string): string => {
  const encoded = encodePath(path);
  if (rev.kind === 'commit') {
    return `${SCHEME}${SCHEME_SEP}${URI_AUTHORITIES.commit}/${rev.sha}/${encoded}`;
  }
  return `${SCHEME}${SCHEME_SEP}${URI_AUTHORITIES.index}/${encoded}`;
};

const parseCommitUri = (rest: string): Result<DiffyUriComponents, DiffyUriParseError> => {
  const slash = rest.indexOf(PATH_SEP);
  if (slash <= 0) {return err({ kind: 'missingSha' });}
  const sha: Sha = rest.slice(0, slash);
  const encodedPath = rest.slice(slash + 1);
  if (encodedPath === '') {return err({ kind: 'emptyPath' });}
  const decoded = decodePath(encodedPath);
  if (!decoded.ok) {return decoded;}
  return ok({ rev: { kind: 'commit', sha }, path: decoded.value });
};

const parseIndexUri = (rest: string): Result<DiffyUriComponents, DiffyUriParseError> => {
  if (rest === '') {return err({ kind: 'emptyPath' });}
  const decoded = decodePath(rest);
  if (!decoded.ok) {return decoded;}
  return ok({ rev: { kind: 'index' }, path: decoded.value });
};

interface UriSplit {
  readonly scheme: string;
  readonly authority: string;
  readonly rest: string;
}

const splitUri = (uri: string): Result<UriSplit, DiffyUriParseError> => {
  const sep = uri.indexOf(SCHEME_SEP);
  if (sep < 0) {return err({ kind: 'malformed', reason: 'no scheme separator' });}
  const scheme = uri.slice(0, sep);
  const afterScheme = uri.slice(sep + SCHEME_SEP.length);
  const firstSlash = afterScheme.indexOf(PATH_SEP);
  if (firstSlash < 0) {return err({ kind: 'malformed', reason: 'no authority/path separator' });}
  return ok({
    scheme,
    authority: afterScheme.slice(0, firstSlash),
    rest: afterScheme.slice(firstSlash + 1),
  });
};

export const parseDiffyUri = (
  uri: string,
): Result<DiffyUriComponents, DiffyUriParseError> => {
  const split = splitUri(uri);
  if (!split.ok) {return split;}
  if (split.value.scheme !== SCHEME) {
    return err({ kind: 'invalidScheme', got: split.value.scheme });
  }
  if (split.value.authority === URI_AUTHORITIES.commit) {return parseCommitUri(split.value.rest);}
  if (split.value.authority === URI_AUTHORITIES.index) {return parseIndexUri(split.value.rest);}
  return err({ kind: 'invalidAuthority', got: split.value.authority });
};
