const axios = require('axios');

/**
 * Fetches the Rockstar Social Club profile data for a given username.
 * @param {string} username
 * @returns {Promise<{avatarUrl: string|null, rid: number|null}>}
 */
async function fetchUserAvatarUrl(username) {
  try {
    const { data } = await axios.get(
      `https://sc-cache.com/n/${encodeURIComponent(username)}`,
      { timeout: 5000 }
    );

    if (!data?.id) return { avatarUrl: null, rid: null };

    return {
      avatarUrl: `https://prod.cloud.rockstargames.com/members/sc/6266/${data.id}/publish/gta5/mpchars/0.png`,
      rid: data.id
    };
  } catch {
    return { avatarUrl: null, rid: null };
  }
}

module.exports = { fetchUserAvatarUrl };
