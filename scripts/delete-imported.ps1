# Generate customer names list and delete via EC2 SSM
$names = @(
"Manoj Katauli 2","Aslam Babaganj","Shiva","Pranshu Awasthi Isanagar Hardware","Babli Katauli","Rihan Biryani","suraj Mishra Khamaria","Yadav Chacha Saroj","Dinesh Maurya Akhtiyar Pur","Amrish Akhtiyaarpur mc","Ravi Patel Verma Rehuva","Ramkeshan Isanagar","Mo.Ahamad Abhaypur","Chhotu Singh Rajapur","Shiva Gupta Khamariya","Yadav Ramnaresh chacha Cooldrink","Sobran Gupta Said Wale","Neeraj Gupta Ganeshpur (Pappu)","Bala Ji Sweets Katauli","Jairam Awasthi Shivshankar","Harish Mishra Coke","Hafiz Katra","Akram Khan Mirza","Ayush kirana Store Bypaas","Saroj Jaiswal Ramiya Behad","Hajrat Tengnha","Taukir Kafhara","Mahesh Driver","Pranjal Awasthi Virsinghpur","Gufran Namkeen Tanki bypass isanagar","Vinit Vishwakarma Basantapur","Gaurav Tomar","Ganna 2025/2026","Valayat Isanagar","Kuldeep Singh Mangnu Mudi","Kumar medical Virsinghpur","Rajendra Singh Chintapurva","RamDash Musepur","Vinit Namkeen Sallery me","Sabbir Ahmed Isanagar Sahakari Bank","Chandan Porwal Katauli","Imran Kajipur","Rahish Virsinghpur Cooldrink","Arun Diwedi Behda Rajapur Kalan","Anand Gupta momoj","Amrish musepur","Nekram Belgadi","Tahir Hussain VIRSINGHPUR","Campa Sure water","Ram Milan kirana store Isanagr","Akarsh Awasthi Sisaiya Chaurahra","Ramtej Singh Raipur","Manoj Levar","Kisori chaukidaar","Rupbasnt Makapuraw","Ram Gopal Halwai Isanagar","Omkaar Imaliya","Shufiyan Driver","Bablu Jaiswal Sarab Bhatthi","Umesh Ganeshpur","Maurya pailes Isanagar","Naredra Fufa Plaat","Rajesh Kumar Khajuha","Kamal Ganeshpur","Manish Mihipurva","MO. Ahmad Katra Isangar","Dileram Baba Raipur","Sankar Singh Basegapur","Kanhiya Lal Mukhlishpur","Amit Pandey","Vikash Halvai Isanagar","सोनू गिरी कविरहा","Subham Traders Imamganj","Chail Bihari Ura Jalim Nagar","Chafhariya Campa","Vipin Mishra Isanagar","Sunil Halwai Isanagar","Santosh Hasnapur fridge 1","Mohit Singh Raipur","Bapu","Vikky Awasthi Raipur","Hidayat Ali","Rijvan mirjapur","Jamuna Prasad Roshini purva Raipur","Nepal 2","BalGobind Maurya nainapur","Abid Ali katra isanagar","Arvind Kumar Maurya","Maurya Kirana store Tanki bypass","Vijay Awasthi Kirana Sisaiya Chauraha","Ramdayal Sisaiya Sambari","Sushil Chaipurva","Maurya Ji Sisaiya thnda","Siraj Kirana katra Isanagar","Jagdish Raipur","Suresh Laukahi","Manoj Maurya Mc Cococola New","Samarth Mishra(Siva Mishra)","Vinay Mishra Isangar","Sarfhudeen Raipur","Kaushal Singh Nagariya","Rajaram बेलागढ़ी","Abdul Malik Sisaiya","Budhhai Sisaiya","AVS Acisotss","Nitin Muradabaad Coke","BaidRam Thnda Semriya","Vivek Adlishpur Campa Coco","Kallu Saraiya","Shayam Lal Shukla Raipur","Chote Lal Semariya","Mo. Rafeek Chintapurva (Muneer)","Bal Gobind Nainapur","Niraj maurya Dew","Shiv sankar kaka","Ashif kajipur (Sheru)","Faruk Virsinghpur","Rohit Awasthi","Birjesh Akhtiyaarpur","Rakesh chandrasa khurd","Kaless Shivpur","mintu Fhufa (Hardaaspur)","Jamal Neta","Arman Mistri (26Fb)","Yadav Kirana(Khajuha)","Shiv kirana Store Sisaiya chau","Gyanesh Singh (Raipur)","पप्पू जयसवाल खमरिया","Dailybook","Himansu mishra","Sakeel Ghar (मार्च24)","यादव रामनरेश","Khuebeb Ansari Khairi","parshant Lakhimpur","Mikka isanagar (2025)July 15","Dinesh Yadav Munim Nargada","Suraj Singh raipur","Bk singh ganeshpur","Shivam Jaiswal(Chintapurva )","Shivkaran Singh Raipur","Sankar singh","Rajendra Mishra Shivpur (22Fb)","Rajesh Gautam Raipur (28) AWASH","Shyamu Penter","Vinod Kumar Verma Godava Paint 🎨 Saman","Tapsir Ganeshpur","Shufhiyan Sisaiya Chauhraha Campa","Ramakaaat paan Bhandaar","Dr.Munnelal Raipur","Kayum Mirjapur","Vinod Raipur Awas (36)","Manoj Rehuva Chauraha","Guddu Thatheri Masin","Anu Jha Tenthouse","Jai Gurudev Khajuva","chote bhaiya raipur","मलखान सिंह","Yakoob","Ashutosh Tiwari Ganeshpur Thnda","Aslam Likege","Jalil Mirjapur","Safhi Ahmad","UBS Payment And Invoices","Ashish Mishra Tanki Bypaas","Komal Rajpoot","Avnish /Kamlu Maharaj","Raghav Singh Raipur","Ram Pratap Chacha Raipur","AZAD CHINTAPURVA (MUNIR)","Paikarma Cemnt Semriya","Ashok Suttan Raipur","Pramod Raipur","Karan yadav Girgitti","Bachha Lal Saraiya प्रधान","Diwakar da Raipur","Pramod 2 Ramdutt kaka","Manmohan Singh Raipur","Munna Electronics Riksa ( Raja)","Manoj Raipur","Babar makka purva","Ram Milan Awasthi","Puri Ji Chacha Dhuarahra","Tulla Isanagar","Ajay kumar chacha raipur","Prdhaan Mukhlishpur","behda jija","Achhe Lal Muse Pur","नरेंद्र जीजा अलग हिसाब","Vaibhav Enterprise (pallu)","Ram Lakhan Raipur Auto","Tirath Ram Yadav Raipur","Munir","Sonu Katauli","Harsh Gupta"
)

$escaped = $names | ForEach-Object { "'$($_.Replace("'","''"))'" }
$nameList = $escaped -join ", "

$scriptBlock = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const names = [$nameList];
  let total = 0;
  for (const name of names) {
    const customer = await prisma.customer.findFirst({ where: { name } });
    if (customer) {
      await prisma.customerTransaction.deleteMany({ where: { customerId: customer.id } });
      await prisma.customer.delete({ where: { id: customer.id } });
      total++;
    }
  }
  console.log(`Deleted ${total} customers`);
  await prisma.\$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
"@

$scriptPath = "/home/ec2-user/delete_customers.js"
Set-Content -Path "tmp_delete.js" -Value $scriptBlock -Encoding UTF8

# Upload and run on EC2
aws s3 cp tmp_delete.js s3://wise-accounts-deploy/ --region us-east-1
$url = aws s3 presign s3://wise-accounts-deploy/tmp_delete.js --expires-in 3600 --region us-east-1
$json = @{
    commands = @(
        "curl -sSf -o /home/ec2-user/delete_customers.js '$url'",
        "cd /home/ec2-user/wise-accounts && sudo /usr/libexec/docker/cli-plugins/docker-compose -f docker-compose.prod.yml exec -T backend node /home/ec2-user/delete_customers.js"
    )
} | ConvertTo-Json -Compress
[System.IO.File]::WriteAllText("tmp_ssm.json", $json, [System.Text.UTF8Encoding]::new($false))
aws ssm send-command --instance-id i-0b4277d47b7ccdbe2 --document-name "AWS-RunShellScript" --parameters "file://tmp_ssm.json" --region us-east-1 --output text
