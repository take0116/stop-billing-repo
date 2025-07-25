const express = require('express');
const cors = require('cors');
const app = express();
const {CloudBillingClient} = require('@google-cloud/billing').v1;
const {GoogleAuth} = require('google-auth-library'); // ★ プロジェクトID取得のために追加

app.use(cors({ origin: true }));

let billing;
try {
  billing = new CloudBillingClient();
} catch (e) {
    console.error('Failed to initialize CloudBillingClient:', e);
    process.exit(1);
}

app.use(express.json());

app.post('/', async (req, res) => {
  console.log('Request received, processing...');

  try {
    if (!req.body || !req.body.message) {
      console.log('Invalid Pub/Sub message format received.');
      res.status(400).send('Invalid Pub/Sub message format');
      return;
    }
    
    const pubsubMessage = req.body.message;
    const budgetData = JSON.parse(
      Buffer.from(pubsubMessage.data, 'base64').toString()
    );

    if (budgetData.costAmount <= budgetData.budgetAmount) {
      const msg = `No action necessary. (Current cost: ${budgetData.costAmount})`;
      console.log(msg);
      res.status(200).send(msg);
      return;
    }

    console.log(`Budget exceeded (${budgetData.costAmount} > ${budgetData.budgetAmount}). Disabling billing...`);
    
    const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-billing',
    });
    const projectId = await auth.getProjectId();
    const projectName = `projects/${projectId}`;
    console.log(`Successfully fetched project name: [${projectName}]`);

    const [billingInfo] = await billing.getProjectBillingInfo({name: projectName});
    
    if (billingInfo.billingEnabled) {
      const payloadToSend = {
        name: projectName,
        projectBillingInfo: { billingAccountName: null },
      };
      
      await billing.updateProjectBillingInfo(payloadToSend);

      console.log('Billing disabled successfully.');
      res.status(200).send('Billing disabled.');
    } else {
      console.log('Billing already disabled.');
      res.status(200).send('Billing already disabled.');
    }
  } catch (e) {
    console.error('!!! An unhandled error occurred in the request handler !!!');
    console.error('Error Message:', e.message);
    console.error('Error Stack:', e.stack);
    res.status(500).send('An internal server error occurred.');
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
