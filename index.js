const express = require('express');
const app = express();
const {CloudBillingClient} = require('@google-cloud/billing').v1;

const PROJECT_ID = process.env.GCP_PROJECT;
const PROJECT_NAME = `projects/${PROJECT_ID}`;
const billing = new CloudBillingClient();

// JSON���N�G�X�g����͂��邽�߂ɕK�v
app.use(express.json());

// Pub/Sub�����POST���N�G�X�g���󂯎��G���h�|�C���g
app.post('/', async (req, res) => {
  // Pub/Sub���b�Z�[�W�̌`�����`�F�b�N
  if (!req.body || !req.body.message) {
    res.status(400).send('Invalid Pub/Sub message format');
    return;
  }

  const pubsubMessage = req.body.message;
  const budgetData = JSON.parse(
    Buffer.from(pubsubMessage.data, 'base64').toString()
  );

  // �\�Z���������l�𒴂��Ă��Ȃ��ꍇ�͉������Ȃ�
  if (budgetData.costAmount <= budgetData.budgetAmount) {
    const msg = `No action necessary. (Current cost: ${budgetData.costAmount})`;
    console.log(msg);
    res.status(200).send(msg);
    return;
  }

  console.log('Budget exceeded. Disabling billing...');

  try {
    const billingInfo = await _getBillingInfo(PROJECT_NAME);
    if (billingInfo.billingEnabled) {
      await _disableBillingForProject(PROJECT_NAME);
      res.status(200).send('Billing disabled.');
    } else {
      console.log('Billing already disabled.');
      res.status(200).send('Billing already disabled.');
    }
  } catch (e) {
    console.error('Error disabling billing:', e);
    res.status(500).send('Error disabling billing.');
  }
});

const _getBillingInfo = async (projectName) => {
  const [info] = await billing.getProjectBillingInfo({name: projectName});
  return info;
};

const _disableBillingForProject = async (projectName) => {
  await billing.updateProjectBillingInfo({
    name: projectName,
    projectBillingInfo: {billingAccountName: ''}, // �ۋ��𖳌���
  });
};

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});