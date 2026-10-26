function paginate(page, limit) {
  return { limit, offset: (page - 1) * limit };
}

function pageMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// Escapes LIKE wildcards so user input is matched literally.
function likePattern(term) {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

module.exports = { paginate, pageMeta, likePattern };
