// wasm-regex-tree - WebAssembly visualizer for Rust regular expressions.
// Copyright (C) 2026 Soumendra Ganguly

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import init, { visualize } from "./wasm_regex_tree.js";

await init();

const btn       = document.getElementById("btn");
const patternEl = document.getElementById("pattern");
const errorEl   = document.getElementById("error");
const treesEl   = document.getElementById("trees");

function num(id) { return parseFloat(document.getElementById(id).value); }

function run() {
  errorEl.textContent = "";
  const result = visualize(
    patternEl.value,
    num("leaf_spacing"),
    num("level_height"),
    num("rect_width"),
    num("rect_height"),
    num("padding"),
    num("edge_width"),
    num("label_font_size"),
    num("corner_radius"),
  );

  if (result.startsWith("AST error:") || result.startsWith("HIR error:")) {
    errorEl.textContent = result;
    treesEl.innerHTML = "";
    return;
  }

  const [astSvg, hirSvg] = result.split("||");

  function openTab(svg) {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    window.open(URL.createObjectURL(blob));
  }

  treesEl.innerHTML = `
    <figure>${astSvg}</figure>
    <figure>${hirSvg}</figure>
  `;

  const [astFig, hirFig] = treesEl.querySelectorAll("figure");

  const astBtn = document.createElement("button");
  astBtn.textContent = "AST (new tab)";
  astBtn.addEventListener("click", () => openTab(astSvg));
  astFig.appendChild(astBtn);

  const hirBtn = document.createElement("button");
  hirBtn.textContent = "HIR (new tab)";
  hirBtn.addEventListener("click", () => openTab(hirSvg));
  hirFig.appendChild(hirBtn);
}

btn.addEventListener("click", run);
patternEl.addEventListener("keydown", e => { if (e.key === "Enter") run(); });

document.getElementById("params-btn").addEventListener("click", () => {
  document.getElementById("params-panel").classList.toggle("visible");
});
document.getElementById("legend-btn").addEventListener("click", () => {
  document.getElementById("legend-panel").classList.toggle("visible");
});

run();
