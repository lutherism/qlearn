import express from 'express';
import morgan from 'morgan';

const app = express();

app.use(morgan('combined'))
app.use('/', express.static('./public'));
app.use('/dist', express.static('./dist'));
app.use(require('connect-livereload')());

app.listen(1458, (err, res) => {
  console.log('listening to 1458', err, res);
});
