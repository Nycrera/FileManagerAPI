CREATE TABLE `files` (
	`id` INT(10) NOT NULL AUTO_INCREMENT,
	`name` varchar(30) NOT NULL UNIQUE,
	`dir` varchar(100) NOT NULL UNIQUE,
	`mime` varchar(30) NOT NULL,
	`size` INT(15) NOT NULL,
	`hash` varchar(100) UNIQUE,
	`time` INT(15) NOT NULL,
	PRIMARY KEY (`id`)
);

