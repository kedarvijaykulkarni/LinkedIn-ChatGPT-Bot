import { } from 'dotenv/config';

import axios from 'axios';
import fs from 'fs';
import querystring from 'querystring';
import request from 'request';

export class LinkedIn {
  /****************************************************************************************************
   Constructor
  *******************************************************************************************************/
  constructor() {
    this.apiKey = process.env.API_KEY;
    this.apiUrl = process.env.API_URL || 'https://api.openai.com/v1/chat/completions';
    this.appUrl = process.env.appUrl || `http://localhost:${process.env.PORT}`;
    this.client_id = process.env.LINKEDIN_CLIENTID;
    this.client_secret = process.env.LINKEDIN_CLIENT_SECRET;
  }

  async getAnswer(req, res) {
    const { apiKey, apiUrl, appUrl } = this;
    let response = await axios.post(apiUrl, {
      'model': 'gpt-3.5-turbo',
      'temperature': 0.7,
      'messages': [{ 'role': 'system', 'content': 'You are' }, { 'role': 'user', 'content': req.body.pinput }]
    },{
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
    })
    .then(function (response) {
      return response;
    })
    .catch(function (error) {
      console.log(error);
    });
    const reply = response?.data?.choices[0]?.message.content || response?.error?.message || { message: 'Sorry, I did not understand that.' };

    let document = JSON.stringify({
      'input': req.body.pinput,
      'output': reply,
    })

    fs.writeFile('./blogtext.json', document, function (err) {
      if (err) {
        console.log('There has been an error saving your configuration data.');
        console.log(err.message);
        return;
      }
    });

    // Post to LinkedIn
    try {
      res.redirect(
        `${appUrl}/linkedin`
      );
    } catch (err) {
      console.error(err);
    }
  }

  async auth(req, res) {
    const { appUrl, client_id, client_secret} = this;
    const data = {
      grant_type: 'authorization_code',
      code: req.query.code,
      client_id,
      client_secret,
      redirect_uri: `${appUrl}/auth`,
    };

    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    let response = '';

    try {
      response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        querystring.stringify(data),
        config
      );
    } catch (err) {
      console.error(err);
    }

    // Retrieving Member ID
    let meRes = '';
    if (response) {
      try {
        meRes = await axios.get('https://api.linkedin.com/v2/me', {
          headers: {
            Authorization: `Bearer ${response.data.access_token}`,
          },
        });
      } catch (err) {
        console.error(err);
      }
    }

    // post on linkedin
    if (response && meRes) {

      var readFileData = fs.readFileSync('./blogtext.json'),
      blogText;

      try {
        blogText = JSON.parse(readFileData);
        console.dir(blogText);
      }
      catch (err) {
        console.log('There has been an error parsing your JSON.')
        console.log(err);
      }

      let body = {
        owner: 'urn:li:person:' + meRes.data.id,
        subject: blogText.input,
        text: {
          text: blogText.input + '\n' +
            blogText.output + '\n\nContent generated by ChatGPT (non-human) AI language model.\n',
        },
        content: {
          contentEntities: [
            {
              entityLocation: 'https://github.com/kedarvijaykulkarni/LinkedIn-ChatGPT-Bot',
              thumbnails: [
                {
                  resolvedUrl:
                    'https://avatars.githubusercontent.com/u/46336951?s=138&v=4',
                },
              ],
            },
          ],
          title:
            blogText.input,
        },
        distribution: {
          linkedInDistributionTarget: {},
        },
      };

      let headers = {
        'Content-Type': 'application/json',
        'cache-control': 'no-cache',
        'X-Restli-Protocol-Version': '2.0.0',
        'x-li-format': 'json',
        Authorization: `Bearer ${response.data.access_token}`,
      };

      const url = 'https://api.linkedin.com/v2/shares';

      var postResponse = '';
      /**/
      try {
        postResponse = new Promise((resolve, reject) => {
          request.post(
            { url: url, json: body, headers: headers },
            (err, response, body) => {
              if (err) {
                reject(err);
              }
              resolve(body);
            }
          );
        });
      } catch (err) {
        console.error('err ::', err);
      }

      res.status(200).send(blogText);
    }
  }

  accessToken(res) {
    res.status(200).send('done');
  }

  linkedin(req, res) {
    const { appUrl, client_id } = this;
    const scope = 'r_liteprofile r_emailaddress w_member_social';
    const url = 'https://www.linkedin.com/oauth/v2/authorization';
    const redirectURL = `${appUrl}/auth&state=2022&scope=${scope}`;

    res.redirect(
      `${url}/?response_type=code&client_id=${client_id}&redirect_uri=${redirectURL}`
    );
  }
}
