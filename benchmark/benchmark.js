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
  const date = new Date();
  bench.add(mask, () => {
    dateFormat(date, mask);
  });
});

await bench.run()

console.log(bench.name)
console.table(bench.table())
