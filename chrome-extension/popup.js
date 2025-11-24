document.addEventListener('DOMContentLoaded', async () => {
  const responseDiv = document.getElementById('response');
  const callApiBtn = document.getElementById('callApi');

  async function getGithubCookies() {
    return new Promise((resolve) => {
      chrome.cookies.getAll({url: 'https://github.com'}, (cookies) => {
        let x_github_session = '', x_user_session = '', x_github_username = '';
        cookies.forEach(cookie => {
          if (cookie.name === '_gh_sess') x_github_session = cookie.value;
          if (cookie.name === 'user_session') x_user_session = cookie.value;
          if (cookie.name === 'dotcom_user') x_github_username = cookie.value;
        });
        resolve({x_github_session, x_user_session, x_github_username});
      });
    });
  }

  async function getCurrentTabUrl() {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (!tabs || !tabs[0]) {
          console.error('Could not get the active tab.');
          reject('Could not get the active tab.');
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, {type: 'getUrl'}, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message to content script:', chrome.runtime.lastError.message);
            reject('Could not get the page URL. Make sure you are on a Zenduty incident details page.');
            return;
          }
          if (!response || !response.url) {
            console.error('No response or missing url from content script:', response);
            reject('Could not get the page URL. Make sure you are on a Zenduty incident details page.');
            return;
          }
          resolve(response.url);
        });
      });
    });
  }

  callApiBtn.addEventListener('click', async () => {
    responseDiv.textContent = '';
    let url = '';
    try {
      url = await getCurrentTabUrl();
    } catch (err) {
      responseDiv.textContent = err + '\nIf you keep seeing this, reload the Zenduty page and try again.';
      return;
    }
    const match = url.match(/https:\/\/www\.zenduty\.com\/dashboard\/incidents\/(\d+)\/details\//);
    if (!match) {
      responseDiv.textContent = 'Validation failed: URL is not an incident URL.';
      return;
    }
    const incident_id = match[1];
    const x_github_api_version = window.LCNC_ENV.X_GITHUB_API_VERSION;
    // Get cookies from github.com
    const {x_github_session, x_user_session, x_github_username} = await getGithubCookies();
    if (!x_github_session || !x_user_session || !x_github_username) {
      responseDiv.textContent = 'GitHub cookies not found. Please log in to github.com.';
      chrome.tabs.create({url: 'https://github.com/login'});
      return;
    }

    // P1. Fetch incident data
    try {
      const apiUrl = `${window.LCNC_ENV.ZENDUTY_INCIDENT_API_BASE}${incident_id}/`;
      const incidentRes = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!incidentRes.ok) {
        responseDiv.textContent = 'Failed to fetch incident data.';
        return;
      }
      const incidentData = await incidentRes.json();
      const subject = incidentData.title || '';
      const content = incidentData.summary || '';
      // P2. Call lcnc LENS
      const headers = {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'authorization': window.LCNC_ENV.AUTHORIZATION_HEADER,
        'cache-control': 'max-age=0',
        'copilot-integration-id': 'copilot-chat',
        'origin': 'https://github.com',
        'priority': 'u=1, i',
        'referer': 'https://github.com/',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'x-github-api-version': x_github_api_version,
        'x_github_username': x_github_username,
        'x_user_session': x_user_session,
        'x_github_session': x_github_session,
        'Content-Type': 'application/json'
      };
      const body = JSON.stringify({ subject, content, url });
      console.log('LCNC Lens Request Headers:', headers);
      console.log('LCNC Lens Request Body:', body);
      const res = await fetch(window.LCNC_ENV.DEBUG_API_URL, {
        method: 'POST',
        headers,
        body
      });
      const text = await res.text();
      responseDiv.textContent = text;
    } catch (err) {
      responseDiv.textContent = 'Error: ' + err;
    }
  });

  document.getElementById('callApi').addEventListener('click', function() {
    const bgFade = document.getElementById('bg-fade');
    document.body.classList.remove('bg-fadein');
    document.body.classList.add('bg-fadeout');
    setTimeout(() => {
      bgFade.style.background = "url('assets/goku_after.jpg') center center/cover no-repeat transparent";
      document.body.classList.remove('bg-fadeout');
      document.body.classList.add('bg-fadein');
    }, 700);
  });

  // Added event listeners for quick link buttons (CSP safe)
  document.getElementById('listTestsBtn').addEventListener('click', () => {
    window.open('https://lcnc-api.browserstack.com/admin/tests/', '_blank');
  });
  document.getElementById('listBuildsBtn').addEventListener('click', () => {
    window.open('https://lcnc-api.browserstack.com/admin/builds', '_blank');
  });
  document.getElementById('listLocalTestRunsBtn').addEventListener('click', () => {
    window.open('https://lcnc-api.browserstack.com/admin/local_test_runs', '_blank');
  });
  document.getElementById('showTestBtn').addEventListener('click', () => {
    const testId = document.getElementById('test_hashed_id').value;
    if (testId) window.open('https://lcnc-api.browserstack.com/admin/tests/' + testId, '_blank');
  });
  document.getElementById('showBuildBtn').addEventListener('click', () => {
    const buildId = document.getElementById('build_hashed_id').value;
    if (buildId) window.open('https://lcnc-api.browserstack.com/admin/builds/' + buildId, '_blank');
  });
  document.getElementById('showTestRunBtn').addEventListener('click', () => {
    const runId = document.getElementById('test_run_hashed_id').value;
    if (runId) window.open('https://lcnc-api.browserstack.com/admin/test_run_details/' + runId, '_blank');
  });
});
