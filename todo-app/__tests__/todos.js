/* eslint-disable space-before-function-paren */
/* eslint-disable comma-dangle */
/* eslint-disable semi */
/* eslint-disable quotes */
const request = require("supertest");
const cheerio = require("cheerio");

const db = require("../models/index");
const app = require("../app");

let server, agent;
function extractCsrfToken(res) {
  const $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

describe("Todo Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Creates a todo and responds with json at /todos POST endpoint", async () => {
    const res = await agent.get("/");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString().split("T")[0],
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Update a todo with the given ID as complete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString().split("T")[0],
      completed: false,
      _csrf: csrfToken,
    });
    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.listDueToday.length;
    const latestTodo = parsedGroupedResponse.listDueToday[dueTodayCount - 1];

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        completed: true,
        _csrf: csrfToken,
      });
    const parsedUpdatedResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdatedResponse.completed).toBe(true);
  });

  test("Update a todo with the given ID as incomplete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString().split("T")[0],
      completed: false,
      _csrf: csrfToken,
    });
    const groupedTodosResponse2 = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse2 = JSON.parse(groupedTodosResponse2.text);
    const dueTodayCount2 = parsedGroupedResponse2.listDueToday.length;
    const latestTodo = parsedGroupedResponse2.listDueToday[dueTodayCount2 - 1];

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const markIncompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
      });
    const parsedUpdatedResponse2 = JSON.parse(markIncompleteResponse.text);
    expect(parsedUpdatedResponse2.completed).toBe(false);
  });

  // test("Deletes a todo with the given ID ", async () => {
  //   // FILL IN YOUR CODE HERE
  //   let res = await agent.get("/");
  //   let csrfToken = extractCsrfToken(res);

  //   await agent.post("/todos").send({
  //     title: "Buy milk",
  //     dueDate: new Date().toISOString().split("T")[0],
  //     completed: false,
  //     _csrf: csrfToken,
  //   });

  //   const parsedResponse = await agent.get("/todos").set("Accept", "application/json");
  //   const parsedResponse3 = JSON.parse(parsedResponse.text);
  //   const dueTodayCount = parsedResponse3.listDueToday.length;
  //   const currentTodo = parsedResponse3.listDueToday[dueTodayCount - 1];
  //   res = await agent.get("/");
  //   csrfToken = extractCsrfToken(res);
  //   const removed = await agent.delete(`/todos/${currentTodo}`).send({
  //     _csrf: csrfToken,
  //   });
  //   const removedResponse = JSON.parse(removed.text);
  //   expect(removedResponse.status).toBe(200);
  // });
});
