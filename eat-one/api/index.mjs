import app from "../server/index.mjs";

export default function handler(req, res) {
  const path = Array.isArray(req.query.path)
    ? req.query.path.join("/")
    : req.query.path;
  if (path) {
    const url = new URL(req.url, "https://eatone1.vercel.app");
    url.searchParams.delete("path");
    req.url =
      "/api/" +
      path +
      (url.searchParams.size ? "?" + url.searchParams.toString() : "");
  }
  return app(req, res);
}
