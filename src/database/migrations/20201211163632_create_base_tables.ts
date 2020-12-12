import * as Knex from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('carlist', (table) => {
    table.bigIncrements('id').primary();
    table.text('platform').notNullable();
    table.text('platform_id').notNullable().unique();
    table.text('url').notNullable();
    table.dateTime('date_of_scan').defaultTo(knex.raw('now()'));
    table.boolean('crawled').defaultTo(false);
  });

  await knex.schema.createTable('cartype', (table) => {
    table.bigIncrements('id').primary().notNullable();
    table.text('make').notNullable();
    table.text('model').notNullable();
    table.integer('age').notNullable();
  });

  await knex.schema.createTable('carspec', (table) => {
    table.bigIncrements('id').unsigned().index().references('id').inTable('carlist');
    table.bigInteger('cartype').unsigned().index().references('id').inTable('cartype');
    table.integer('price').notNullable();
    table.integer('ccm');
    table.text('fuel');
    table.text('transmission');
    table.integer('kw');
    table.integer('km');
    table.text('city');
    table.integer('zipcode');
  });

  await knex.schema.createTable('average_prices', (table) => {
    table.bigInteger('id').unsigned().index().references('id').inTable('cartype');
    table.integer('avg').notNullable();
    table.integer('median').notNullable();
  });

  await knex.schema.createTable('working_queue', (table) => {
    table.bigInteger('id').unsigned().index().references('id').inTable('carlist');
    table.boolean('working').defaultTo(false);
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('working_queue');
  await knex.schema.dropTable('average_prices');
  await knex.schema.dropTable('carspec');
  await knex.schema.dropTable('cartype');
  await knex.schema.dropTable('carlist');
}

