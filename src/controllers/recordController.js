const recordService = require("../services/recordService");

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, type, category, dateFrom, dateTo, minAmount, maxAmount, userId } = req.query;
    const filters = { type, category, dateFrom, dateTo, minAmount, maxAmount, userId };
    const result = recordService.getRecords(filters, { page: +page, limit: +limit }, req.user);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const record = recordService.getRecordById(req.params.id, req.user);
    res.status(200).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { amount, type, category, date, notes } = req.body;
    const record = recordService.createRecord({ amount, type, category, date, notes }, req.user.id);
    res.status(201).json({ success: true, message: "Record created.", data: record });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { amount, type, category, date, notes } = req.body;
    const record = recordService.updateRecord(req.params.id, { amount, type, category, date, notes }, req.user);
    res.status(200).json({ success: true, message: "Record updated.", data: record });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = recordService.deleteRecord(req.params.id, req.user);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getOne, create, update, remove };
