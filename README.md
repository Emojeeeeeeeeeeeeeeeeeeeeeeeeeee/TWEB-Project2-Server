# TWEB-Project2-Server



## Database

**User:**

| id   | username | password | email | messages      | followed   | followers  |
| ---- | -------- | -------- | ----- | ------------- | ---------- | ---------- |
|      |          |          |       | [Message(id)] | [User(id)] | [User(id)] |



**Message:**

| id   | content | like     | time      | author   |
| ---- | ------- | -------- | --------- | -------- |
|      |         | user(id) | timeStamp | user(id) |



