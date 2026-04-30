const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const csvImportService = require('../services/csvImportService');

router.use(authMiddleware);

router.post('/import', async (req, res, next) => {
  try {
    const { csv, data, mapping } = req.body;
    
    if (data && mapping) {
      const results = await csvImportService.importMappedData(req.user.id, req.user.family_id, data, mapping);
      res.json(results);
    } else if (csv) {
      const results = await csvImportService.importCSV(req.user.id, req.user.family_id, csv);
      res.json(results);
    } else {
      return res.status(400).json({ message: 'Требуется CSV контент или данные с маппингом' });
    }
  } catch (error) {
    next(error);
  }
});

router.get('/template', (req, res) => {
  const template = csvImportService.getImportTemplate();
  res.json(template);
});

module.exports = router;