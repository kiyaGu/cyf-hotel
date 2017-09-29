const express = require('express');
const router = express.Router();
const filename = './database/database.sqlite';
const sqlite3 = require('sqlite3').verbose();

// open the database
let db = new sqlite3.Database(filename);

router.get('/customers', function(req, res) {
    // TODO comment out response above and uncomment the below
    db.serialize(function() {

        const sql = 'SELECT * from customers';

        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error(err)
            } else {
                res.status(200).json({
                    customers: rows
                });
            }
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

    const sqlSelect = `SELECT email FROM customers
                WHERE email = ?`;
    db.all(sqlSelect, [`${email}`], (err, response) => {
        if (err) {
            console.error(err)
        } else if (response.length > 0) {
            res.status(200).json({ message: `A customer with the email address ${response[0].email} is already registerd with us.
                                   if that is You please, log in` });
        } else {
            const sqlInsert = `INSERT INTO customers (title,firstname,surname,email) 
        VALUES (?,?,?,?)`;
            db.run(sqlInsert, [`${title}`, `${firstname}`, `${surname}`, `${email}`], function(err) {
                if (err) {
                    res.status(200).json({
                        message: "error: " + err
                    });
                } else {
                    res.status(200).json({ message: "You have registered with us successfully!!!" });
                }
            });
        }
    });



});
router.get('/room-types', function(req, res) {
    // TODO return DB row here
    db.serialize(function() {
        const sql = 'select * from room_types ORDER BY original_price ASC';
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
});

router.get('/discount', (req, res) => {
    //TODO populate the id field with data from the server
    const sqlSelectRoomIds = `SELECT id FROM room_types`;
    db.all(sqlSelectRoomIds, [], (err, data) => {
        if (err) {
            console.error(err)
        } else {
            res.status(200).json({ data: data });
        }
    });
});
router.put('/discount', function(req, res) {
    // TODO read roomId from req.query.id and update discount
    const sqlSelect = `SELECT * from room_types 
                WHERE id = ?`;
    //req.query.id => to get the id that is passed as part of the url
    db.all(sqlSelect, [req.query.id], (err, currentPrice) => {
        console.log(currentPrice)
            //assumption: the discount is given in % as 10 means 10% and the discount is done on the 
            //the current price if the current and the original price are equal it is a new discount on the original price else
            // it is it is a further reduction on the current_price
        let newPrice,
            current_price = currentPrice[0].current_price,
            discountRate = req.body.discount;

        newPrice = Math.floor(current_price - (current_price * (discountRate / 100)));
        const updateSql = `UPDATE room_types
                        SET  current_price = ?
                        WHERE id = ?`;
        db.run(updateSql, [`${newPrice }`, `${req.query.id }`], (err) => {
            if (err) {
                res.status(200).json({
                    message: "error: " + err
                });
            } else {

                res.status(200).json({ message: "Record updated successfully" });
            }

        })
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

    const sqlSelectCheckRoom = `SELECT * FROM reservations 
                WHERE room_id = ? AND 
                julianday(?) BETWEEN julianday(check_in_date) AND julianday(check_out_date) AND
                julianday(?) <> julianday(check_out_date)`;
    db.all(sqlSelectCheckRoom, [`${ roomId }`, `${checkInDate}`, `${checkInDate}`], (err, record) => {
        if (record.length > 0) {
            res.status(200).json({
                message: `Sorry, the room is alrady booked from ${record[0].check_in_date} till ${record[0].check_out_date}`
            });
        } else {
            const sql = `SELECT current_price from room_types
                            WHERE id = ? `;
            db.all(sql, [`${ roomId }`], (err, currentPrice) => {
                let price = currentPrice[0].current_price;
                const reservationSql = `
                            INSERT INTO reservations(customer_id, room_id, check_in_date, check_out_date, room_price)
                            VALUES( ? , ? , ? , ? , ? )
                            `;
                db.run(reservationSql, [`${ customerId }`, `${ roomId }`, `${checkInDate }`, `${ checkOutDate }`, price], (err) => {
                    if (err) {
                        res.status(200).json({
                            message: "error: " + err
                        });
                    } else {
                        res.status(200).json({ message: "Your reservation has been made successfully" });
                    }
                });

            });
        }
    });

});
router.get('/search', (req, res) => {
    //TODO populate the customer id field with data from the server
    const sqlSelectCustomerId = `SELECT id FROM customers`;
    db.all(sqlSelectCustomerId, [], (err, data) => {
        if (err) {
            console.error(err)
        } else {
            res.status(200).json({ data: data });
        }
    });
});
router.get('/reservations', function(req, res) {
    // TODO read req.query.name or req.query.id to look up reservations and return
    // the search by name is done through using surname
    const sql = `SELECT customers.title,customers.firstname,customers.surname,customers.email,
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
    const sql = `SELECT customers.title,customers.firstname,customers.surname,customers.email,
               reservations.room_id AS roomId,reservations.check_in_date AS checkInDate,reservations.check_out_date AS checkOutDate
               FROM customers
               INNER JOIN reservations 
               on customers.id = reservations.customer_id
               WHERE check_in_date BETWEEN date(?) AND date(?,'start of month','+1 month','-1 day')
               ORDER BY julianday(check_in_date)`;

    db.all(sql, [req.params.dateFrom, req.params.dateFrom], (err, reservations) => {
        if (err) {
            console.error(err)
        } else {
            res.status(200).json({ reservations: reservations });
        }

    });

});
router.get('/invoice', (req, res) => {
    //TODO populate the id field with data from the server
    const sqlSelectReservationId = `SELECT id FROM reservations`;
    db.all(sqlSelectReservationId, [], (err, data) => {
        if (err) {
            console.error(err)
        } else {
            res.status(200).json({ data: data });
        }
    });
});
router.put('/invoice', function(req, res) {
    // TODO read req.query.reservationId and req.body.invoice and insert into DB
    const reservationId = req.query.reservationId;
    console.log(req.body.invoice.invoiceDate)
    const {
        surcharges,
        total,
        invoiceDate,
        paid
    } = req.body.invoice;
    const sqlInsert = `INSERT INTO invoices (reservation_id,surcharges,total,invoice_date_time,paid)
               VALUES(?,?,?,?,?)`;

    db.run(sqlInsert, [reservationId, `${surcharges}`, `${total}`, `${invoiceDate}`, `${paid}`], (err, invoice) => {
        if (err) {
            res.status(200).json({
                message: "error: " + err
            });
        } else {
            res.status(200).json({ message: "The Invoice has been recorded successfully!" });
        }
    });

});

router.post('/reviews', function(req, res) {
    // TODO read req.body.review
    const {
        customerId,
        roomTypeId,
        rating,
        comment,
        reviewDate
    } = req.body.review;
    const sqlInsert = `INSERT INTO reviews (customer_id,room_type_id,rating,comment,review_date)
                        VALUES(?,?,?,?,?)`;
    db.run(sqlInsert, [`${customerId}`, `${roomTypeId}`, `${rating}`, `${comment}`, `${reviewDate}`], (err, invoice) => {
        if (err) {
            res.status(200).json({
                message: "error: " + err
            });
        } else {
            res.status(200).json({ message: "Your review has been submited successfully!" });
        }
    });
});
router.get('/reviews', function(req, res) {
    // TODO comment out response above and uncomment the below
    db.serialize(function() {
        const sqlSelect = `SELECT type_name AS roomType, AVG(rating) AS rating FROM room_types 
                   INNER JOIN reviews 
                   ON room_types.id = reviews.room_type_id
                   GROUP BY reviews.room_type_id`;
        db.all(sqlSelect, [], (err, rows) => {
            res.status(200).json({
                reviews: rows
            });
        });
    });

});
module.exports = router;