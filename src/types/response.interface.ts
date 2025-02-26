export type IgniterResponseSuccess<TData = any> = {
  data: TData;
  error: null;
};

export type IgniterResponseError = {
  error: {
    code: 'ERR_UNKNOWN_ERROR';
    data: unknown;
  };
};

export type IgniterResponseBadRequest = {
  error: {
    code: 'ERR_BAD_REQUEST';
    data: unknown;
  };
};

export type IgniterResponseRedirect = {
  error: {
    code: 'ERR_REDIRECT';
    data: {
      destination: string;
      type: 'replace' | 'push';
    };
  };
};

export type IgniterResponseNotFound = {
  data: null;
  error: {
    code: 'ERR_NOT_FOUND';
    data: unknown;
  };
};

export type IgniterResponseUnauthorized = {
  error: {
    code: 'ERR_UNAUTHORIZED';
    data: unknown;
  };
};

export type IgniterResponseForbidden = {
  error: {
    code: 'ERR_FORBIDDEN';
    data: unknown;
  };
};

export type IgniterResponse<TData = any> =
  IgniterResponseSuccess<TData> |
  IgniterResponseBadRequest |
  IgniterResponseError |
  IgniterResponseRedirect |
  IgniterResponseNotFound |
  IgniterResponseUnauthorized |
  IgniterResponseForbidden
