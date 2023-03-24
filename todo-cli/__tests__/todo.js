const todoList = require('../todo')

const {all, markAsComplete, add} = todoList();

describe("First Test Suite",()=>{
    beforeAll(() => {
        add({
            title:"Todo test",
            complete: false,
            dueDate: new Date().toISOString().slice(0,10)
        });
    });

    test("Should add new item",()=>{
        const todoListCount = all.length
        add({
            title:"Todo test",
            complete: false,
            dueDate: new Date().toISOString().slice(0,10)
        })
        expect(all.length).toBe(todoListCount+1)
    })

    test("Should mark as complete",() => {
        markAsComplete(0)
        expect(all[0].completed).toBe(true)
    })
})