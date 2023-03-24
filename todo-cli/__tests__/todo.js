const todoList = require("../todo");

const { all, markAsComplete, add, overdue, dueToday, dueLater } = todoList();

const formattedDate = (d) => {
  return d.toISOString().split("T")[0];
};

var dateToday = new Date();
const today = formattedDate(dateToday);
const yesterday = formattedDate(
  new Date(new Date().setDate(dateToday.getDate() - 1))
);
const tomorrow = formattedDate(
  new Date(new Date().setDate(dateToday.getDate() + 1))
);

describe("Todo Test Suite", () => {
  beforeAll(() => {
    add({
      title: "Todo test 1",
      complete: false,
      dueDate: today,
    });
    add({
      title: "Todo test 2",
      complete: false,
      dueDate: tomorrow,
    });
    add({
      title: "Todo test 3",
      complete: false,
      dueDate: yesterday,
    });
  });

  test("Should add new item", () => {
    const todoListCount = all.length;
    add({
      title: "Todo test 4",
      complete: false,
      dueDate: today,
    });
    expect(all.length).toBe(todoListCount + 1);
  });

  test("Should mark as complete", () => {
    markAsComplete(0);
    expect(all[0].completed).toBe(true);
  });

  test("Check retrieval of today due items", () => {
    let todayDue = dueToday();
    expect(todayDue[0]).toBe(all[0]);
    expect(todayDue[1]).toBe(all[3]);
  });

  test("Check retrieval of tomorrow due items", () => {
    let tomorrowDue = dueLater();
    expect(tomorrowDue[0]).toBe(all[1]);
  });

  test("Check retrieval of yesterday due items", () => {
    let yesterdayDue = overdue();
    expect(yesterdayDue[0]).toBe(all[2]);
  });
});
