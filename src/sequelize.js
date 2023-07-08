const { Client } = require("pg");

const { createProjectAccessTable } = require("./Schema/project_access");

let client;
const initPostgresClient = async () => {
  try {
    client = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    await client.connect();
  } catch (err) {
    console.log(err);
  }
};

const getClient = () => {
  return client;
};

// const createTables = async () => {
//   //`create type EXTRATRACKEDSTATUS as enum ('pending','approved','rejected')`;
//   await createUsersTable();
//   await createConfigsTable();
//   await createProjectsTable();
//   await createTasksTable();
//   await createTaskHistoryTable();
//   await createLatestTaskTable();
//   await createNotificationsTable();
//   await createFavoriteProjectsTable();
//   await createTeamsTable();
//   await createTeamMembersTable();
//   await createProjectMembersTable();
//   await createExtraTrackedTasksTable();
//   await createProjectAccessTable();
//   await createMessageSchedulesTable();
//   await createExtraTrackedTasksHistoriesTable();

//   await modifyExistingSchema();
// };

//exports.createTables = createTables;
exports.initPostgresClient = initPostgresClient;
exports.getClient = getClient;
