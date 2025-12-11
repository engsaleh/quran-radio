
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Cache headers
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  next();
});

async function proxyJson(req, res, url) {
  try {
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Proxy error", details: e.toString() });
  }
}

// Reciters
app.get("/api/reciters", (req, res) =>
  proxyJson(
    req,
    res,
    "https://api.cms.itqan.dev/developers-api/reciters/?ordering=name&page=1&page_size=100"
  )
);

// Riwayahs
app.get("/api/riwayahs", (req, res) =>
  proxyJson(
    req,
    res,
    "https://api.cms.itqan.dev/developers-api/riwayahs/?ordering=name&page=1&page_size=100"
  )
);

// Recitations
app.get("/api/recitations", (req, res) => {
  const params = new URLSearchParams(req.query).toString();
  proxyJson(
    req,
    res,
    `https://api.cms.itqan.dev/developers-api/recitations/?${params}`
  );
});

// Tracks
app.get("/api/recitations/:id", (req, res) =>
  proxyJson(
    req,
    res,
    `https://api.cms.itqan.dev/developers-api/recitations/${req.params.id}/`
  )
);

// Streaming audio proxy
app.get("/api/audio", async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: "Missing url query parameter" });
  }
  try {
    const response = await fetch(url);
    res.setHeader(
      "Content-Type",
      response.headers.get("Content-Type") || "audio/mpeg"
    );
    if (!response.body) {
      return res.status(500).json({ error: "No response body from origin" });
    }
    response.body.pipe(res);
  } catch (e) {
    res.status(500).json({ error: "Audio proxy error", details: e.toString() });
  }
});

const PORT = process.env.PORT || 3000;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Quran Spotify Radio running at http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      if (port === 3000) {
        const fallback = 3001;
        console.log(
          `⚠️ Port ${port} is in use. Trying fallback port ${fallback}...`
        );
        startServer(fallback);
      } else {
        console.error("Both 3000 and 3001 are in use. Please free a port.");
      }
    } else {
      throw err;
    }
  });
}

startServer(PORT);
