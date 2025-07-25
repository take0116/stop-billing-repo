const express = require('express');
const app = express();
const {CloudBillingClient} = require('@google-cloud/billing').v1;

const PROJECT_ID = process.env.GCP_PROJECT || 'GCP_PROJECT environment variable is not set.';
const PROJECT_NAME = `projects/${PROJECT_ID}`;
let billing;
try {
  billing = new CloudBillingClient();
} catch (e) {
    console.error('Failed to initialize CloudBillingClient:', e);
    // クライアントの初期化に失敗した場合、サーバーを起動せずに終了
    process.exit(1);
}


app.use(express.json());

app.post('/', async (req, res) => {
  console.log('Request received, processing...'); // リクエスト処理開始のログ

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

    const billingInfo = await billing.getProjectBillingInfo({name: PROJECT_NAME});
    
    if (billingInfo.billingEnabled) {
      await billing.updateProjectBillingInfo({
        name: PROJECT_NAME,
        projectBillingInfo: {billingAccountName: ''},
      });
      console.log('Billing disabled successfully.');
      res.status(200).send('Billing disabled.');
    } else {
      console.log('Billing already disabled.');
      res.status(200).send('Billing already disabled.');
    }
  } catch (e) {
    // ★★★ エラーをより詳しくログに出力するよう修正 ★★★
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
