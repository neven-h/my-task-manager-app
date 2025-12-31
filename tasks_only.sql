SET NAMES utf8mb4;
-- MySQL dump 10.13  Distrib 9.5.0, for macos15.7 (arm64)
--
-- Host: localhost    Database: task_tracker
-- ------------------------------------------------------
-- Server version	9.5.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` (`id`, `title`, `description`, `category`, `categories`, `client`, `task_date`, `task_time`, `duration`, `status`, `tags`, `notes`, `created_at`, `updated_at`) VALUES (1,'להכין דוח תנועות בכרטיס אשראי','להכין דוח תנועות בכרטיס אשראי','banking','banking,moshe','ליפשיץ','2025-12-28','18:01:00',1.00,'completed','','','2025-12-28 17:37:52','2025-12-30 13:12:04'),(2,'המשך טיפול בנושא עובדת סיעודית','\nמעבר על כל הפעולות שבוצעו בכרטיסי אשראי ומשיכות בחודשים אוגוסט עד דצמבבר\nהשוואה בין ההוצאות וייצור דו״ח של פעולות\nעדכון של כל המשימות לטיפול - החדשות והישנות\"','banking','banking,moshe','ליפשיץ','2025-12-28','15:50:36',1.50,'completed','','','2025-12-28 19:29:45','2025-12-29 00:19:50'),(10,'system transaction process','Not to mention the fact that the system has no ability to clean any xlsx files of transactions, in fact, it process the dirty files, as if there is no transaction in the file at all, which is not true. But let\'s keep this issue for later as for now it\'s all gibberish.','other','other,customer-support','me','2025-12-29','02:48:00',NULL,'uncompleted','System','','2025-12-29 00:48:38','2025-12-29 00:48:38'),(11,'להזמין שמאי לדירה של בני ברח׳ העבודה ולדירה בהרצפלד','להזמין שמאי לדירה של בני ברח׳ העבודה ולדירה בהרצפלד','other','other','ליפשיץ','2025-12-29','11:10:00',0.00,'uncompleted','נדלן','','2025-12-29 09:10:46','2025-12-29 09:10:46'),(12,'להוסיף משיכות מזומן להראות את ההוצאות באשראי בשילוב עם מזומן','להוסיף משיכות מזומן להראות את ההוצאות באשראי בשילוב עם מזומן','moshe','moshe,banking','ליפשיץ','2025-12-30','15:12:00',0.00,'uncompleted','','','2025-12-30 13:13:28','2025-12-30 13:13:28');
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-31 21:16:38
