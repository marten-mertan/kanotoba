import {
  parsePositiveInteger,
  parseNonNegativeInteger,
} from "./http.js";

const MAX_LIMIT = 100;
const MAX_OFFSET = 100000;

export function getPaginationParams(url, { defaultLimit = 50 } = {}) {
  return {
    limit: parsePositiveInteger(
      url.searchParams.get("limit"),
      defaultLimit,
      MAX_LIMIT,
    ),
    offset: parseNonNegativeInteger(
      url.searchParams.get("offset"),
      0,
      MAX_OFFSET,
    ),
  };
}

export function createPagination({ limit, offset, returned, total }) {
  const normalizedTotal = Math.max(0, Number(total) || 0);
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(normalizedTotal / limit);

  return {
    limit,
    offset,
    returned,
    total: normalizedTotal,
    page,
    totalPages,
    hasPrevious: offset > 0 && normalizedTotal > 0,
    hasMore: offset + returned < normalizedTotal,
  };
}
