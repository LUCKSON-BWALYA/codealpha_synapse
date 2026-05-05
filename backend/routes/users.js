//** user Routes - /api/users(JWT protected) */

const router   = require("express").Router();
const { userStore } = require("../lib/userStore");

// get current user profile
router.get("/me", (req, res) =>{
    const user = userStore.findById(req.user.sub);
    if (!user) return res.status(404).json({ error: "user not found"});
    const { passwordHash, ...safe } = user;
    res.json({ user: safe });
});

//list all users (minus password)
router.get("/", (req, res) => {
    res.json({ users: userStore.list() });
});

module.exports = router;