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

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  const csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password,
    _csrf: csrfToken,
  });
};

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

  test("Sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      firstName: "Test",
      lastName: "User A",
      email: "user.a@test.com",
      password: "123456789",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Sign out", async () => {
    let res = await agent.get("/todo");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/todo");
    expect(res.statusCode).toBe(302);
  });

  test("Creates a todo and responds with json at /todos POST endpoint", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "123456789");
    const res = await agent.get("/todo");
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
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "123456789");
    let res = await agent.get("/todo");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    const groupedTodosResponse = await agent
      .get("/todo")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.listDueToday.length;
    const latestTodo = parsedGroupedResponse.listDueToday[dueTodayCount - 1];

    res = await agent.get(`/todo`);
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
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "123456789");
    let res = await agent.get("/todo");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Buy meat",
      dueDate: new Date().toISOString(),
      _csrf: csrfToken,
    });

    const groupedTodosResponse1 = await agent
      .get("/todo")
      .set("Accept", "application/json");
    const parsedGroupedResponse1 = JSON.parse(groupedTodosResponse1.text);
    const dueTodayCount1 = parsedGroupedResponse1.alltodos.length;
    const latestTodo1 = parsedGroupedResponse1.alltodos[dueTodayCount1 - 1];

    res = await agent.get("/todo");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo1.id}`)
      .send({
        completed: true,
        _csrf: csrfToken,
      });
    const parsedUpdatedResponse1 = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdatedResponse1.completed).toBe(true);

    res = await agent.get("/todo");
    csrfToken = extractCsrfToken(res);

    const groupedTodosResponse = await agent
      .get("/todo")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.alltodos.length;
    const latestTodo = parsedGroupedResponse.alltodos[dueTodayCount - 1];

    const markIncompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        completed: false,
        _csrf: csrfToken,
      });
    const parsedUpdatedResponse = JSON.parse(markIncompleteResponse.text);
    expect(parsedUpdatedResponse.completed).toBe(false);
  });

  test("Deletes a todo with the given ID ", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "123456789");
    let res = await agent.get("/todo");
    let csrfToken = extractCsrfToken(res);

    await agent.post("/todos").send({
      title: "Buy milk",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const response = await agent.get("/todos");
    const parsedResponse = JSON.parse(response.text);
    const dueTodayCount = parsedResponse.length;
    const currentTodo = parsedResponse[dueTodayCount - 1];
    res = await agent.get("/todo");
    csrfToken = extractCsrfToken(res);
    const removedResponse = await agent
      .delete(`/todos/${currentTodo.id}`)
      .send({
        _csrf: csrfToken,
      });
    expect(removedResponse.status).toBe(200);
  });

  test("Verify a user cannot markAsComplete other user's todos ", async () => {
    let agent = request.agent(server);
    // Signing in as user A
    await login(agent, "user.a@test.com", "123456789");
    let res = await agent.get("/todo");
    let csrfToken = extractCsrfToken(res);

    res = await agent.get("/todo");
    csrfToken = extractCsrfToken(res);
    const userA = await agent.post("/todos").send({
      title: "verify test markAsComplete",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    await agent.get("/signout");

    agent = request.agent(server);
    // Signing in as user B
    await login(agent, "user.b@test.com", "987654321");
    res = await agent.get("/todo");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponse = await agent.put(`/todos/${userA.id}`).send({
      completed: true,
      _csrf: csrfToken,
    });
    expect(markCompleteResponse.statusCode).toBe(500);
  });

  test("Verify a user cannot markAsInComplete other user's todos ", async () => {
    let agent = request.agent(server);
    // Signing in as user A
    await login(agent, "user.a@test.com", "123456789");
    let res = await agent.get("/todo");
    let csrfToken = extractCsrfToken(res);

    res = await agent.get("/todo");
    csrfToken = extractCsrfToken(res);
    const userA = await agent.post("/todos").send({
      title: "verify test markAsComplete",
      dueDate: new Date().toISOString(),
      completed: true,
      _csrf: csrfToken,
    });
    await agent.get("/signout");

    agent = request.agent(server);
    // Signing in as user B
    await login(agent, "user.b@test.com", "987654321");
    res = await agent.get("/todo");
    csrfToken = extractCsrfToken(res);

    const markAsInCompleteResponse = await agent
      .put(`/todos/${userA.id}`)
      .send({
        completed: false,
        _csrf: csrfToken,
      });
    expect(markAsInCompleteResponse.statusCode).toBe(500);
  });

  test("Verify a user cannot delete other user's todos ", async () => {
    let agent = request.agent(server);
    // Signing in as user A
    await login(agent, "user.a@test.com", "123456789");
    let res = await agent.get("/todo");
    let csrfToken = extractCsrfToken(res);

    res = await agent.get("/todo");
    csrfToken = extractCsrfToken(res);
    const userA = await agent.post("/todos").send({
      title: "verify test markAsComplete",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    await agent.get("/signout");

    agent = request.agent(server);
    // Signing in as user B
    await login(agent, "user.b@test.com", "987654321");
    res = await agent.get("/todo");
    csrfToken = extractCsrfToken(res);

    const removedResponse = await agent.delete(`/todos/${userA.id}`).send({
      _csrf: csrfToken,
    });
    expect(removedResponse.statusCode).toBe(500);
  });
});
