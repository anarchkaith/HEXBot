function buildBasicAuthHeader(username, password) {
  if (!username || !password) return null;
  const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

module.exports = {
  buildBasicAuthHeader
};
