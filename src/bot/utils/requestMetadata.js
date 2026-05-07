function getHeaderValue(headers, name) {
  const value = headers?.[name];
  return typeof value === 'string' ? value : null;
}

function extractIp(req) {
  const forwardedFor = getHeaderValue(req.headers, 'x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = getHeaderValue(req.headers, 'x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return req.socket?.remoteAddress || null;
}

function extractCountry(headers) {
  return (
    getHeaderValue(headers, 'cf-ipcountry') ||
    getHeaderValue(headers, 'x-vercel-ip-country') ||
    getHeaderValue(headers, 'x-country-code') ||
    null
  );
}

function buildWebRequestMetadata(req) {
  const headers = req.headers || {};

  return {
    ip: extractIp(req),
    forwardedFor: getHeaderValue(headers, 'x-forwarded-for'),
    realIp: getHeaderValue(headers, 'x-real-ip'),
    country: extractCountry(headers),
    userAgent: getHeaderValue(headers, 'user-agent'),
    referer: getHeaderValue(headers, 'referer'),
    origin: getHeaderValue(headers, 'origin'),
    host: getHeaderValue(headers, 'host'),
    method: req.method || null,
    path: req.url || null,
    headers: {
      cfConnectingIp: getHeaderValue(headers, 'cf-connecting-ip'),
      cfIpCountry: getHeaderValue(headers, 'cf-ipcountry'),
      xForwardedProto: getHeaderValue(headers, 'x-forwarded-proto'),
      xForwardedHost: getHeaderValue(headers, 'x-forwarded-host'),
      xVercelIpCountry: getHeaderValue(headers, 'x-vercel-ip-country')
    }
  };
}

module.exports = {
  buildWebRequestMetadata
};
