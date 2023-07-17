import DataStore from "nestdb";

export const userDb = new DataStore({
  filename: "./db/users.db",
});

export const loadAllDb = () => {
  userDb.load((err) => {
    console.log("[⚡️ DB:USER]: User Db Loaded Successfully");
  });
};
