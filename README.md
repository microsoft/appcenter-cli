UberScriptQuery
============

UberScriptQuery is a script query wrapper to run Spark SQL jobs.

Why did we build this? Apache Spark is a great tool to do data processing, yet people usually end up writing many similar Spark jobs. There is substantial development cost to write and maintain all these jobs. Additionally, Spark is still mostly for developers, and other people such as data analysts or data scientists may still feel that Spark has a steep learning curve.

To make Spark easier, we define a high level SQL-like DSL (Domain Specific Language) on top of Spark. People can use that DSL to write Spark jobs without worrying about Spark internal details. Another benefit to define such a DSL is to break up complicated logic or SQL query to a declarative script, which is easy to review and maintain. Our result? UberScriptQuery, a SQL-like DSL to make writing Spark jobs super easy.

DSL Example
============

The following is a quick example for the UberScriptQuery DSL. It queries data from a MySQL database and Hadoop file, joins them together, and saves the result to another MySQL data table.

```
-- Define variables
datePath = '2017/01/10';
  
-- Load data from mysql
clients = sql jdbc set connectionString='jdbc:mysql://server:3306/database';
  select clientId, clientName from dim_client;
  
-- Load data from hadoop
orders = file json hdfs:///dir/to/files/${datePath}/*;
  
-- Join data from two tables
result = select clientName, productName, totalCount, orderId, orderDescription 
  from orders
  join clients on clients.clientId = orders.clientId;
  
-- Write result to mysql output table
-- The output table will be auto created if not exist, and will have:
-- Primary Key Columns: clientName,productName,orderId
-- Index Columns: clientName,orderId
-- Text Columns: orderDescription
  
writeJdbc('jdbc:mysql://server:3306/database',
  'jdbcTable',
  'clientName,productName,orderId',
  'clientName,orderId',
  'orderDescription',
  'Append',
  result);
  
-- Send email via MailGun
sendMailGunEmail('https://api.mailgun.net/v3/sandbox549566ecba1d49fab0d7b53d4cfb01a4.mailgun.org/messages',
  'MailGun_ApiKey',
  'from_email@example.com',
  'to_email@example.com',
  'Email Title - Job Done',
  'Email Content - Successfully queried data on ${datePath}');

```

DSL Features
============

1. **Flexible Input/Output**: it supports multiple input/output data sources with different formats, including database and Hadoop. It is also possible to add other data sources like Cassandra and Elasticsearch.

2. **Multiple SQL Statements**: it allows executing multiple SQL Statements, storing temporary results in another table, and referencing them in other SQL statements. This avoids a huge complicated single SQL statement, and makes the logic very clear and easy to maintain.

3. **Variable Substitution**: it allows defining variables with names/values, and substitute these variable in the script body. It also allows variable overwriting from outside of the script, so people can run the same script with different variable bindings.

4. **Custom Action**: it supports Actions like writeJdbc() in the previous DSL example. It also allows users to write their own Actions and plug into the script.

5. **Upsert Result to Database**: it implements an "upsert" based JDBC writer, and can insert/update database records in a single operation. This makes it easy to provide "Exactly Once" semantic support for Spark Jobs.

Quick Start
============

Build this project with Maven with Java 1.8:
```
mvn package -DskipTests
```

Run the following command to execute your first UberScriptQuery job:
```
java -cp target/UberScriptQuery-1.1.01.jar com.uber.uberscriptquery.examples.QueryExampleJob \
  -query "result = select cast(unix_timestamp() as timestamp) as time, 'Hello World' as message; printTable(result);" 
```

The following is another example to run with variable overwriting (note we use '&#92;${message}' in following command because of escaping $ in bash command, in programming code, it should be like '${message}'):
```
java -cp target/UberScriptQuery-1.1.01.jar com.uber.uberscriptquery.examples.QueryExampleJob \
  -query "message = 'Hello World'; result = select cast(unix_timestamp() as timestamp) as time, '\${message}' as message; printTable(result);" \
  -queryOverwrite "message = 'Hello New World';"
```

You could also integrate the UberScriptQuery Engine into your own code, and run the script in your own job:
```
QueryEngine engine = new QueryEngine();
engine.executeScript(script, sparkSession);
```

There are more detailed sample codes in this class:

```
com.uber.uberscriptquery.examples.QueryExecutionExample
```

Future Work
============

1. Support more data sources, e.g. Cassandra and Elasticsearch.

2. Support "upsert" into more databases like PostgreSQL. Now it only supports MySQL and H2 database.
