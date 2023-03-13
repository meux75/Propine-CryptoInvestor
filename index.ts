import axios from 'axios';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';


// Define the file path to read
const filePath = path.join(__dirname, 'data/transactions.csv');

// interface for transactions
interface Transaction {
  timestamp: number;
  transaction_type: string;
  token: string;
  amount: number;
}

// fetch the latest USD exchange rate for a token
async function getExchangeRate(token: string): Promise<number> {
  const response = await axios.get(`https://min-api.cryptocompare.com/data/price?fsym=${token}&tsyms=USD`);
  return response.data.USD;
}

// read the CSV file and extract transactions
const transactions: Transaction[] = [];
fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (data) => {
    transactions.push({
      timestamp: parseInt(data.timestamp),
      transaction_type: data.transaction_type,
      token: data.token,
      amount: parseFloat(data.amount),
    });
  })
  .on('end', async () => {
    // group transactions by token and calculate the token balance
    const balances: { [token: string]: number } = {};
    transactions.forEach((transaction) => {
      const { transaction_type, token, amount } = transaction;
      if (transaction_type === 'DEPOSIT') {
        if (balances[token]) {
          balances[token] += amount;
        } else {
          balances[token] = amount;
        }
      } else if (transaction_type === 'WITHDRAWAL') {
        if (balances[token]) {
          balances[token] -= amount;
        } else {
          balances[token] = -amount;
        }
      }
    });

    // rate for each token and calculate portfolio value
    const portfolio: { [token: string]: number } = {};
    const tokens = Object.keys(balances);
    for (const token of tokens) {
      const exchangeRate = await getExchangeRate(token);
      const balance = balances[token];
      portfolio[token] = exchangeRate * balance;
    }

    // print portfolio to console
    console.log(portfolio);
  });
