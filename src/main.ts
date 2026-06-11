import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/sections.css";

import { initCopyButtons } from "./lib/copy";
import { initCrystallizer } from "./lib/crystallizer";
import { initGlitch } from "./lib/glitch";
import { initNav } from "./lib/nav";
import { initReveal } from "./lib/reveal";
import { initSpecular } from "./lib/specular";

initNav();
initReveal();
initSpecular();
initGlitch();
initCopyButtons();
initCrystallizer();
