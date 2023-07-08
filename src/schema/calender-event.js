const postgres = require("../sequelize");

const createCalenderEventTable = async () => {
  const client = postgres.getClient();

  try {
    const query = `CREATE TABLE IF NOT EXISTS calenderEvent (
                    email VARCHAR, 
                    event_id   VARCHAR,
                    title  VARCHAR,
                    description  VARCHAR,
                    duration  VARCHAR,
                    due_date_gmt  VARCHAR,
                    due_date_local  VARCHAR,
                    priority  VARCHAR,
                    want_need varchar,
                    start_time varchar,
                    snooze_time varchar,
                    start_date  VARCHAR,
                    end_date  VARCHAR,

               
                )`;
    await client.query(query);
  } catch (err) {
    console.log(err);
  }
};

exports.createCalenderEventTable  = createCalenderEventTable 
