const express = require('express');
const router = express.Router();
const filename = './database/database.sqlite';
const sqlite3 = require('sqlite3').verbose();

// open the database
let db = new sqlite3.Database(filename);

router.get('/customers', function(req, res) {

    // res.status(200).json({
    //     customers: [{
    //         id: 2,
    //         title: 'Mr',
    //         firstname: 'Laurie',
    //         surname: 'Ainley',
    //         email: 'laurie@ainley.com'
    //     }]
    // });
    // TODO comment out response above and uncomment the below
    db.serialize(function() {

        var sql = 'select * from customers';

        db.all(sql, [], (err, rows) => {
            res.status(200).json({
                customers: rows
            });
        });
    });

});

router.post('/customers', function(req, res) {
    // TODO read req.body.customer and insert into DB
    const {
        title,
        firstname,
        surname,
        email
    } = req.body.customer;
    let sql = `INSERT INTO customers (title,firstname,surname,email) 
    VALUES (?,?,?,?)`;
    db.run(sql, [`${title}`, `${firstname}`, `${surname}`, `${email}`], function(err) {
        if (err) {
            console.error(err)
        } else {
            res.status(200).json({ message: "Record inserted successfully" });
        }

    });


});
router.get('/room-types', function(req, res) {
    // TODO return DB row here
    db.serialize(function() {
        var sql = 'select * from room_types ORDER BY original_price ASC';
        db.all(sql, [], (err, rows) => {
            let temp = [];
            rows.forEach((element) => {
                let price;
                if (element.original_price === element.current_price) {
                    price = '£' + element.original_price / 100;
                } else {
                    price = `<span style = 'text-decoration:line-through'>£${element.original_price/ 100}</span> £${element.current_price/ 100}`
                }
                temp.push({
                    id: element.id,
                    name: element.type_name,
                    price: price
                });
            })
            res.status(200).json({
                roomtypes: temp
            });
        });
    });

    //current_price does not equal the standard_price
    //text-decoration: line-through
    // res.status(200).json({
    //     roomtypes: [{
    //         id: 2,
    //         name: 'premium',
    //         standard_price: 60,
    //         current_price: 50
    //     }]
    // });
});

router.put('/discount', function(req, res) {
    // TODO read roomId from req.query.id and update discount

    let sql = 'select * from room_types where id = ?';
    //req.query.id => to get the id that is passed as part of the url
    db.all(sql, [req.query.id], (err, currentPrice) => {
        console.log(currentPrice)
            //assumption: the discount is given in % as 10 means 10% and the discount is done on the 
            //the current price if the current and the original price are equal it is a new discount on the original price else
            // it is it is a further reduction on the current_price
        let newPrice,
            current_price = currentPrice[0].current_price,
            discountRate = req.body.discount;

        newPrice = current_price - (current_price * (discountRate / 100));
        let updateSql = `UPDATE room_types
                        SET  current_price = ?
                        WHERE id = ?`;
        db.run(updateSql, [`${newPrice }`, `${req.query.id }`], (err) => {
                if (err) {
                    console.error(err)
                } else {

                    res.status(200).json({ message: "Record updated successfully" });
                }

            })
            // res.status(200).json(rows);
            // res.status(200).json({
            //     id: req.query.id,
            //     discount: req.body.discount
            // });
    });

});

router.post('/reservations', function(req, res) {
    // TODO read req.body.reservation, look up price by room id and insert reservation into DB
    const {
        customerId,
        roomId,
        checkInDate,
        checkOutDate
    } = req.body.reservation;

    let sql1 = `SELECT * FROM reservations 
                WHERE room_id = ? AND 
                julianday(?) BETWEEN julianday(check_in_date) AND julianday(check_out_date) AND
                julianday(?) <> julianday(check_out_date)`;
    db.all(sql1, [`${ roomId }`, `${checkInDate}`, `${checkInDate}`], (err, record) => {
        if (record.length > 0) {
            res.status(200).json({
                message: `Sorry, the room is alrady booked from ${record[0].check_in_date} till ${record[0].check_out_date}`
            });
        } else {
            let sql = `SELECT current_price from room_types
                            WHERE id = ? `;
            db.all(sql, [`${ roomId }`], (err, currentPrice) => {
                let price = currentPrice[0].current_price;
                reservationSql = `
                            INSERT INTO reservations(customer_id, room_id, check_in_date, check_out_date, room_price)
                            VALUES( ? , ? , ? , ? , ? )
                            `;
                db.run(reservationSql, [`${ customerId }`, `${ roomId }`, `${checkInDate }`, `${ checkOutDate }`, price], (err) => {
                    if (err) {
                        console.error(err)
                    } else {
                        res.status(200).json({ message: "Your reservation has been made successfully" });
                    }
                });

            });
        }
    });

});

router.get('/reservations', function(req, res) {
    // TODO read req.query.name or req.query.id to look up reservations and return
    // the search by name is done through using surname
    let sql = `SELECT customers.title,customers.firstname,customers.surname,customers.email,
               reservations.room_id AS roomId,reservations.check_in_date AS checkInDate,reservations.check_out_date AS checkOutDate
               FROM customers
               INNER JOIN reservations 
               on customers.id = reservations.customer_id
               WHERE customers.id = ? OR customers.surname = ?`;
    db.all(sql, [req.query.id, req.query.name], (err, reservation) => {
        if (err) {
            console.error(err)
        } else {
            res.status(200).json({ reservations: reservation });
        }
    });
});

router.get('/reservations/date-from/:dateFrom', function(req, res) {
    // TODO read req.params.dateFrom to look up reservations and return
    res.status(200).json({
        reservations: [{
            title: 'Mr',
            firstname: 'Laurie',
            surname: 'Ainley',
            email: 'laurie@ainley.com',
            roomId: 1,
            checkInDate: '2017-10-10',
            checkOutDate: '2017-10-17'
        }, {
            title: 'Miss',
            firstname: 'Someone',
            surname: 'Else',
            email: 'someone@else.com',
            roomId: 2,
            checkInDate: '2017-11-12',
            checkOutDate: '2017-11-15'
        }]
    });
});

router.put('/invoice', function(req, res) {
    // TODO read req.query.reservationId and req.body.invoice and insert into DB
    res.status(200).json({
        reservationId: req.query.reservationId,
        invoice: req.body.invoice
    });
});

router.post('/reviews', function(req, res) {
    // TODO read req.body.review
    res.status(200).json(req.body);
});

module.exports = router;