const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  text: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: "User" },
  date_created: { type: Date, default: Date.now },
});

MessageSchema.virtual("elapsed").get(function () {
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });

  const DIVISIONS = [
    { amount: 60, name: "seconds" },
    { amount: 60, name: "minutes" },
    { amount: 24, name: "hours" },
    { amount: 7, name: "days" },
    { amount: 4.34524, name: "weeks" },
    { amount: 12, name: "months" },
    { amount: Number.POSITIVE_INFINITY, name: "years" },
  ];

  function formatTimeAgo(date) {
    let duration = (date - new Date()) / 1000;

    for (let i = 0; i < DIVISIONS.length; i++) {
      const division = DIVISIONS[i];
      if (Math.abs(duration) < division.amount) {
        return formatter.format(Math.round(duration), division.name);
      }
      duration /= division.amount;
    }
  }

  return formatTimeAgo(this.date_created);
});

module.exports = mongoose.model("Message", MessageSchema);
