const request = require("supertest");
const app = require("../app.js");
const db = require("../db/connection.js");
const data = require("../db/data/test-data/index.js");
const seed = require("../db/seeds/seed.js");
const endpoints = require("../endpoints.json");

beforeEach(() => {
  return seed(data);
});

afterAll(() => {
  db.end();
});

describe("GET /api", () => {
  it("GET:404 should check error is returned when given invalid path", () => {
    return request(app)
      .get("/api/HELLO")
      .expect(404)
      .then(({ body }) => {
        expect(body.msg).toBe("Path not found");
      });
  });
  it("GET:200 should return status code 200 when path is valid", () => {
    return request(app).get("/api/topics").expect(200);
  });
  it("should provide description of all endpoints available", () => {
    return request(app)
      .get("/api")
      .then(({ body }) => {
        expect(body.endpoints).toMatchObject(endpoints);
      });
  });
});

describe("GET /api/topics", () => {
  it("GET:200 should return status code 200", () => {
    return request(app).get("/api/topics").expect(200);
  });
  it("GET:200 should provide all topics from table in correct format", () => {
    return request(app)
      .get("/api/topics")
      .then(({ body }) => {
        const topics = body.topics;
        expect(topics).toHaveLength(3);
        topics.forEach((topic) => {
          expect(typeof topic.description).toBe("string");
          expect(typeof topic.slug).toBe("string");
        });
      });
  });
});

describe("GET /api/articles", () => {
  it("GET:200 should return status code 200", () => {
    return request(app).get("/api/articles").expect(200);
  });
  it("GET:200 should respond with an array of article objects, each with the correct format", () => {
    return request(app)
      .get("/api/articles")
      .then(({ body }) => {
        expect(body).toHaveLength(13);
        body.forEach((article) => {
          expect(article).toHaveProperty("article_id");
          expect(article).toHaveProperty("title");
          expect(article).toHaveProperty("topic");
          expect(article).toHaveProperty("author");
          expect(article).toHaveProperty("created_at");
          expect(article).toHaveProperty("votes");
          expect(article).toHaveProperty("article_img_url");
          expect(article).toHaveProperty("comment_count");
        });
      });
  });
  it("GET:200 should order articles by date in descending order as default", () => {
    return request(app)
      .get("/api/articles")
      .then(({ body }) => {
        expect(body).toHaveLength(13);
        expect(body).toBeSortedBy("created_at", { descending: true });
      });
  });
  describe("GET /api/articles?topic=:query", () => {
    it("GET:200 should filter articles by the topic stated in the query and return them", () => {
      return request(app)
        .get("/api/articles?topic=cats")
        .then(({ body }) => {
          expect(body).toHaveLength(1);
          body.forEach((article) => {
            expect(article.topic).toBe("cats");
          });
        });
    });
    it("GET:404 return error if topic does not exist", () => {
      return request(app)
        .get("/api/articles?topic=roast-chicken")
        .expect(404)
        .then(({ body }) => {
          expect(body.msg).toBe("Topic not found");
        });
    });
    it("GET:200 return empty array if topic exists but is not associated with any articles", () => {
      return request(app)
        .get("/api/articles?topic=paper")
        .expect(200)
        .then(({ body }) => {
          expect(body).toEqual([]);
        });
    });
  });
  describe("GET /api/articles?:queries", () => {
    it("GET:200 should sort by any column passed in as query (desc by default)", () => {
      return request(app)
        .get("/api/articles?sort_by=author")
        .then(({ body }) => {
          expect(body).toBeSortedBy("author", { descending: true });
        });
    });
    it("GET:200 should allow client to sort response object by ascending", () => {
      return request(app)
        .get("/api/articles?sort_by=title&order=asc")
        .then(({ body }) => {
          expect(body).toBeSortedBy("title", { ascending: true });
        });
    });
    it("GET:200 should work alongside topic query", () => {
      return request(app)
        .get("/api/articles?sort_by=title&order=asc&topic=mitch")
        .then(({ body }) => {
          expect(body).toHaveLength(12);
          body.forEach((article) => {
            expect(article.topic).toBe("mitch");
          });
          expect(body).toBeSortedBy("title", { ascending: true });
        });
    });
    it("GET:400 should throw error if sort_by query does not match any column", () => {
      return request(app)
        .get("/api/articles?sort_by=mongolia")
        .expect(400)
        .then(({ body }) => {
          expect(body.msg).toBe("Invalid sort query");
        });
    });
    it("GET:400 should throw error if order query does not match asc or desc", () => {
      return request(app)
        .get("/api/articles?sort_by=title&order=trebuchet")
        .expect(400)
        .then(({ body }) => {
          expect(body.msg).toBe("Invalid order query");
        });
    });
  });
});

describe("GET /api/articles/:article_id", () => {
  it("GET:200 should return status code 200", () => {
    return request(app).get("/api/articles/1").expect(200);
  });
  it("GET:200 should provide the article by its ID", () => {
    return request(app)
      .get("/api/articles/1")
      .then(({ body }) => {
        const article = body.article;

        expect(article).toHaveProperty("title", expect.any(String));
        expect(article).toHaveProperty("topic", expect.any(String));
        expect(article).toHaveProperty("created_at", expect.any(String));
        expect(article).toHaveProperty("author", expect.any(String));
        expect(article).toHaveProperty("article_id", expect.any(Number));
        expect(article).toHaveProperty("votes", expect.any(Number));
      });
  });
  it("GET:404 should return error if article ID does not exist", () => {
    return request(app)
      .get("/api/articles/9999")
      .expect(404)
      .then((response) => {
        expect(response.body.msg).toBe("Article ID not found");
      });
  });
  it("GET:400 should return error if given invalid article ID", () => {
    return request(app)
      .get("/api/articles/hamsandwich")
      .expect(400)
      .then((response) => {
        expect(response.body.msg).toBe("Bad request");
      });
  });
  it("GET:200 should also include comment_count in response object", () => {
    return request(app)
      .get("/api/articles/1/")
      .then(({ body }) => {
        expect(body.article.comment_count).toBe(11);
      });
  });
});

describe("GET /api/articles/:article_id/comments", () => {
  it("GET:200 should return 200 status code", () => {
    return request(app).get("/api/articles/1/comments").expect(200);
  });
  it("GET:200 should provide all comments for specified article in correct format", () => {
    return request(app)
      .get("/api/articles/1/comments")
      .then(({ body }) => {
        expect(body).toHaveLength(11);
        body.forEach((comment) => {
          expect(comment).toHaveProperty("comment_id", expect.any(Number));
          expect(comment).toHaveProperty("votes", expect.any(Number));
          expect(comment).toHaveProperty("created_at", expect.any(String));
          expect(comment).toHaveProperty("author", expect.any(String));
          expect(comment).toHaveProperty("body", expect.any(String));
          expect(comment).toHaveProperty("article_id", expect.any(Number));
        });
      });
  });
  it("GET:200 should return most recent comments first", () => {
    return request(app)
      .get("/api/articles/1/comments")
      .then(({ body }) => {
        expect(body).toBeSortedBy("created_at", { descending: true });
      });
  });
  it("GET:200 should return an empty array if article ID exists but has no comments", () => {
    return request(app)
      .get("/api/articles/2/comments")
      .then(({ body }) => {
        expect(body).toEqual([]);
      });
  });
  it("GET:404 should return error if article ID is valid but doesnt exist", () => {
    return request(app)
      .get("/api/articles/9999/comments")
      .expect(404)
      .then((response) => {
        expect(response.body.msg).toBe("Article ID not found");
      });
  });
  it("GET:400 should return error if given invalid article ID", () => {
    return request(app).get("/api/articles/hamsandwich/comments");
  });
});

describe("POST /api/articles/:article_id/comments", () => {
  it("POST:201 should return correct status code", () => {
    return request(app)
      .post("/api/articles/1/comments")
      .send({
        username: "icellusedkars",
        body: "Enjoyed it",
      })
      .expect(201);
  });
  it("POST:201 should post new comment and return comment with confirmation", () => {
    return request(app)
      .post("/api/articles/1/comments")
      .send({
        username: "icellusedkars",
        body: "Enjoyed it",
      })
      .then(({ body }) => {
        expect(body.comment).toHaveProperty("comment_id");
        expect(body.comment).toHaveProperty("body");
        expect(body.comment).toHaveProperty("article_id");
        expect(body.comment).toHaveProperty("author");
        expect(body.comment).toHaveProperty("votes");
        expect(body.comment).toHaveProperty("created_at");
      });
  });
  it("POST:400 should give error when passed object with incorrect format", () => {
    return request(app)
      .post("/api/articles/1/comments")
      .send({
        name: "icellusedkars",
        body: "Enjoyed it",
      })
      .expect(400)
      .then(({ body }) => {
        expect(body.msg).toBe("Bad request");
      });
  });
  it("POST:201 should ignore unecessary additional properties", () => {
    return request(app)
      .post("/api/articles/1/comments")
      .send({
        username: "icellusedkars",
        body: "Enjoyed it",
        extra: "Extra thing",
        extra2: "another one",
      })
      .expect(201)
      .then(({ body }) => {
        expect(body.comment).toHaveProperty("comment_id", expect.any(Number));
        expect(body.comment).toHaveProperty("body", expect.any(String));
        expect(body.comment).toHaveProperty("article_id", expect.any(Number));
        expect(body.comment).toHaveProperty("author", expect.any(String));
        expect(body.comment).toHaveProperty("votes", expect.any(Number));
        expect(body.comment).toHaveProperty("created_at", expect.any(String));
      });
  });
  it("POST:404 should return error if article ID does not exist", () => {
    return request(app)
      .post("/api/articles/9999/comments")
      .send({
        username: "icellusedkars",
        body: "Enjoyed it",
      })
      .expect(404)
      .then((response) => {
        expect(response.body.msg).toBe("Entry not found");
      });
  });
  it("POST:400 should return error if given invalid article ID", () => {
    return request(app)
      .post("/api/articles/hamsandwich/comments")
      .send({
        username: "icellusedkars",
        body: "Enjoyed it",
      })
      .expect(400)
      .then((response) => {
        expect(response.body.msg).toBe("Bad request");
      });
  });
  it("POST:404 should return error if username does not exist", () => {
    return request(app)
      .post("/api/articles/1/comments")
      .send({
        username: "BabeRuth",
        body: "Enjoyed it",
      })
      .expect(404)
      .then((response) => {
        expect(response.body.msg).toBe("Entry not found");
      });
  });
  it("POST:400 should return error if body is empty", () => {
    return request(app)
      .post("/api/articles/1/comments")
      .send({
        username: "icellusedkars",
        body: "",
      })
      .expect(400)
      .then((response) => {
        expect(response.body.msg).toBe(
          "Empty body - comment could not be added"
        );
      });
  });
});

describe("PATCH, /api/articles/:article_id", () => {
  it("PATCH:201 should return 201 status code", () => {
    return request(app)
      .patch("/api/articles/1")
      .send({ inc_votes: 1 })
      .expect(201);
  });
  it("PATCH:201 should increment votes of passed article by the amount given in the req", () => {
    return request(app)
      .patch("/api/articles/1")
      .send({ inc_votes: 2 })
      .then(({ body }) => {
        const templateArticle = {
          article_id: 1,
          title: "Living in the shadow of a great man",
          topic: "mitch",
          author: "butter_bridge",
          body: "I find this existence challenging",
          created_at: "2020-07-09T20:11:00.000Z",
          votes: 102,
          article_img_url:
            "https://images.pexels.com/photos/158651/news-newsletter-newspaper-information-158651.jpeg?w=700&h=700",
        };
        expect(body.updated_article).toMatchObject(templateArticle);
      });
  });
  it("PATCH:404 should return error if article ID does not exist", () => {
    return request(app)
      .patch("/api/articles/9999")
      .send({ inc_votes: 2 })
      .expect(404)
      .then((response) => {
        expect(response.body.msg).toBe("Entry not found");
      });
  });
  it("PATCH:400 should return error if given invalid article ID", () => {
    return request(app)
      .patch("/api/articles/hamsandwich")
      .send({ inc_votes: 2 })
      .expect(400)
      .then((response) => {
        expect(response.body.msg).toBe("Bad request");
      });
  });
  it("PATCH:400 should return error if given improperly formatted req", () => {
    return request(app)
      .patch("/api/articles/1")
      .send({ inc_votes: "ello" })
      .expect(400)
      .then((response) => {
        expect(response.body.msg).toBe("Bad request");
      });
  });
  it("PATCH:201 should ignore unecessary additional properties", () => {
    return request(app)
      .patch("/api/articles/1")
      .send({
        inc_votes: 3,
        extra: 500,
        extra2: "Hello fellow youngsters",
      })
      .then(({ body }) => {
        const templateArticle = {
          article_id: 1,
          title: "Living in the shadow of a great man",
          topic: "mitch",
          author: "butter_bridge",
          body: "I find this existence challenging",
          created_at: "2020-07-09T20:11:00.000Z",
          votes: 103,
          article_img_url:
            "https://images.pexels.com/photos/158651/news-newsletter-newspaper-information-158651.jpeg?w=700&h=700",
        };
        const article = body.updated_article;
        expect(article).toMatchObject(templateArticle);
      });
  });
});

describe("DELETE /api/comments/:comment_id", () => {
  it("DELETE:204 should return 204 status code", () => {
    return request(app).delete("/api/comments/1").expect(204);
  });
  it("DELETE:204 should delete the given comment from the database", () => {
    return request(app)
      .delete("/api/comments/10")
      .then(() => {
        return request(app).get("/api/articles");
      })
      .then(({ body }) => {
        expect(body[0].comment_count).toBe(1);
      });
  });
  it("DELETE:404 should return error if comment does not exist", () => {
    return request(app)
      .delete("/api/comments/1000004848")
      .expect(404)
      .then((response) => {
        expect(response.body.msg).toBe("Comment does not exist");
      });
  });
  it("DELETE:400 should return error if comment is not a valid type", () => {
    return request(app)
      .delete("/api/comments/batman")
      .expect(400)
      .then((response) => {
        expect(response.body.msg).toBe("Bad request");
      });
  });
});

describe("GET /api/users", () => {
  it("GET:200 should return status code 200", () => {
    return request(app).get("/api/users").expect(200);
  });
  it("GET:200 should return array containing all users in the correct format", () => {
    return request(app)
      .get("/api/users")
      .then(({ body }) => {
        expect(body).toHaveLength(4);
        body.forEach((user) => {
          expect(user).toHaveProperty("username", expect.any(String));
          expect(user).toHaveProperty("name", expect.any(String));
          expect(user).toHaveProperty("avatar_url", expect.any(String));
        });
      });
  });
});

describe("GET /api/users/:username", () => {
  it("GET:200 should return status code 200", () => {
    return request(app).get("/api/users/butter_bridge").expect(200);
  });
  it("GET:200 should return an object with the correct format", () => {
    return request(app)
      .get("/api/users/butter_bridge")
      .then(({ body }) => {
        expect(body.username).toBe("butter_bridge");
        expect(body.name).toBe("jonny");
        expect(body.avatar_url).toBe(
          "https://www.healthytherapies.com/wp-content/uploads/2016/06/Lime3.jpg"
        );
      });
  });
  it("GET:404 should return error if username is valid but does not exist", () => {
    return request(app)
      .get("/api/users/frankenstein")
      .expect(404)
      .then((response) => {
        expect(response.body.msg).toBe("Username not found");
      });
  });
});

describe("PATCH, /api/comments/:comment_id", () => {
  it("PATCH:201 should return 201 status code", () => {
    return request(app)
      .patch("/api/comments/1")
      .send({ inc_votes: 1 })
      .expect(201);
  });
  it("PATCH:201 should increment votes of passed article by the amount given in the req", () => {
    return request(app)
      .patch("/api/comments/1")
      .send({ inc_votes: 2 })
      .then(({ body }) => {
        const templateComment = {
          comment_id: 1,
          body: "Oh, I've got compassion running out of my nose, pal! I'm the Sultan of Sentiment!",
          article_id: 9,
          author: "butter_bridge",
          votes: 18,
          created_at: "2020-04-06T12:17:00.000Z",
        };
        expect(body.updated_comment).toMatchObject(templateComment);
      });
  });
  it("PATCH:404 should return error if article ID does not exist", () => {
    return request(app)
      .patch("/api/comments/9999")
      .send({ inc_votes: 2 })
      .expect(404)
      .then((response) => {
        expect(response.body.msg).toBe("Comment not found");
      });
  });
  it("PATCH:400 should return error if given invalid article ID", () => {
    return request(app)
      .patch("/api/comments/hamsandwich")
      .send({ inc_votes: 2 })
      .expect(400)
      .then((response) => {
        expect(response.body.msg).toBe("Bad request");
      });
  });
  it("PATCH:400 should return error if given improperly formatted req", () => {
    return request(app)
      .patch("/api/comments/1")
      .send({ inc_votes: "ello" })
      .expect(400)
      .then((response) => {
        expect(response.body.msg).toBe("Bad request");
      });
  });
  it("PATCH:201 should ignore unecessary additional properties", () => {
    return request(app)
      .patch("/api/comments/1")
      .send({
        inc_votes: 3,
        extra: 500,
        extra2: "Hello fellow youngsters",
      })
      .then(({ body }) => {
        const templateComment = {
          comment_id: 1,
          body: "Oh, I've got compassion running out of my nose, pal! I'm the Sultan of Sentiment!",
          article_id: 9,
          author: "butter_bridge",
          votes: 19,
          created_at: "2020-04-06T12:17:00.000Z",
        };
        const comment = body.updated_comment;
        expect(comment).toMatchObject(templateComment);
      });
  });
});
