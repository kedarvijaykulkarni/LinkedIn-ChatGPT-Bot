import { LinkedIn } from './../controller/linkedin.js';
let linkedin = new LinkedIn();

export default function linkedinBotRoutes(app) {
  app.get('/auth', (req, res) => linkedin.auth(req, res));

  app.get('/linkedin', (req, res) => linkedin.linkedin(req, res));

  app.post('/openai', (req, res) => linkedin.getAnswer(req, res));
}
