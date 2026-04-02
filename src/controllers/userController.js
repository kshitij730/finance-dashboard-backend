const userService = require("../services/userService");

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, role, status } = req.query;
    const result = userService.getAllUsers({ page: +page, limit: +limit, role, status });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const user = userService.getUserById(req.params.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const user = userService.createUser({ name, email, password, role });
    res.status(201).json({ success: true, message: "User created.", data: user });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { name, role, status } = req.body;
    const user = userService.updateUser(req.params.id, { name, role, status });
    res.status(200).json({ success: true, message: "User updated.", data: user });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = userService.deleteUser(req.params.id, req.user.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getOne, create, update, remove };
