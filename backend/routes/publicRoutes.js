import express from "express";
import { getHomestaysSitemap } from "../controllers/publicController.js";

const router = express.Router();

router.get("/homestays-sitemap", getHomestaysSitemap);

export default router;
