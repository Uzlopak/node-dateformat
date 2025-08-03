import { Bench } from "tinybench"
import dateFormat from "../lib/dateformat.js";
import { DateFormatter } from "../date-formatter.js"

const masks = [
  "d",
  "W",
  "o",
  "N",
  "H",
  "S",
  "L",
  "yy",
  "yyyy",
  "isoUtcDateTime",
  "shortDate",
  "fullDate",
  "longTime",
  "default",
];

const bench = new Bench({ name: 'simple benchmark', time: 100 })

masks.forEach((mask) => {
  const date = new Date();
  bench.add(`dateformat ${mask}`, () => {
    dateFormat(date, mask);
  });

  const dateFormatter = new DateFormatter(mask);
  bench.add(`DateFormatter ${mask}`, () => {
    dateFormatter.format(date);
  });
});

{
  const date = new Date();
  bench.add(`dateformat DDDD - today`, () => {
    dateFormat(date, "DDDD");
  });

  const dateFormatter = new DateFormatter("DDDD");
  bench.add(`DateFormatter DDDD - today`, () => {
    dateFormatter.format(date);
  });
}

{
  const date = new Date()
  date.setDate(new Date().getDate() + 1);
  bench.add(`dateformat DDDD - tomorrow`, () => {
    dateFormat(date, "DDDD");
  });

  const dateFormatter = new DateFormatter("DDDD");
  bench.add(`DateFormatter DDDD - tomorrow`, () => {
    dateFormatter.format(date);
  });
}

{
  const date = new Date()
  date.setDate(new Date().getDate() - 1);
  bench.add(`dateformat DDDD - yesterday`, () => {
    dateFormat(date, "DDDD");
  });

  const dateFormatter = new DateFormatter("DDDD");
  bench.add(`DateFormatter DDDD - yesterday`, () => {
    dateFormatter.format(date);
  });
}

await bench.run()

console.log(bench.name)
console.table(bench.table())
