const https = require('https');

module.exports = async function(context, req) {
  const code = req.query.code;
  const state = req.query.state;

  if (!code) {
    context.res = { status: 400, body: 'Missing code' };
    return;
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  const postData = JSON.stringify({ client_id: clientId, client_secret: clientSecret, code });

  const tokenRes = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'github.com',
      path: '/login/oauth/access_token',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  const token = tokenRes.access_token;
  const script = `
<!DOCTYPE html><html><body><script>
(function() {
  function receiveMessage(e) {
    console.log("receiveMessage %o", e);
    window.opener.postMessage(
      'authorization:github:success:{"token":"${token}","provider":"github"}',
      e.origin
    );
    window.removeEventListener("message", receiveMessage, false);
    setTimeout(() => window.close(), 1000);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
<\/script></body></html>`;

  context.res = { status: 200, headers: { 'Content-Type': 'text/html' }, body: script };
};
