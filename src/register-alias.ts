import path from "path";
import moduleAlias from "module-alias";

const baseDir = path.resolve(__dirname);
moduleAlias.addAlias("@", baseDir);
