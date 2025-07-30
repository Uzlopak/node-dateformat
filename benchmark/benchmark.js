import { Bench } from "tinybench"
import dateFormat from "../src/dateformat.js";

const masks = [
  "d",
  "W",
  "o",
  "N",
  "shortDate",
  "fullDate",
  "longTime",
  "default",
];

const bench = new Bench({ name: 'simple benchmark', time: 100 })

masks.forEach((mask) => {
  bench.add(mask, () => {
    dateFormat(new Date(), mask);
  });
});

await bench.run()

console.log(bench.name)
console.table(bench.table())
