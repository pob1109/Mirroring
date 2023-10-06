import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../db/models/userModel.js";
import { NonMember } from "../db/models/nonMemberModel.js";
import { Order } from "../db/models/orderModel.js";
import mongoose from "mongoose";

const ObjectId = mongoose.Types.ObjectId;

// 로그인 시 토큰 발급을 위한 secret key 생성, 일단은 여기다 적음.나중에 안보이게 해야함!
// secret key는 한 번만 생성되어야 함.(고정)
const SECRET_KEY = "thisissecret";

class UserService {
  async verifyToken(token) {
    try {
      // 토큰이 유효한지 확인하기
      const decodingtoken = await jwt.verify(token, SECRET_KEY);
      // 토큰이 유효하다면, 토큰을 해독한 내용을 반환
      return decodingtoken;
    } catch (err) {
      // 토큰이 유효하지 않으면 에러 반환
      return err;
    }
  }

  // 회원가입
  async join(email, password, checkPassword, username, address, phone) {
    // 중복되는 이메일이 존재하는지 검사
    const userExsist = await User.find({ email: email });
    // 중복되는 이메일이 있을 경우 이미 존재하는 사용자라고 알리기
    if (userExsist.length) {
      return {
        status: 400,
        errMsg: "이미 존재하는 이메일입니다. 다른 이메일을 입력해 주세요.",
      };
    }

    // 비밀번호란에 입력된 값과 비밀번호 확인란에 입력된 값이 다르면 비밀번호가 일치하지 않는다고 알려주기
    if (password !== checkPassword) {
      return {
        status: 400,
        errMsg: "비밀번호가 일치하지 않습니다. 다시 입력해 주세요.",
      };
    }

    // 비밀번호 암호화(해싱 5번)
    const hashedPassword = await bcrypt.hash(password, 5);
    // 암호화를 거친 비밀번호를 포함하여 새로운 사용자 정보 객체 생성
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      address,
      phone,
    });
    // db에 저장하기
    await User.create(newUser);
    // 성공 메시지와 새로 가입한 유저 정보 반환
    return {
      status: 200,
      message: "회원 가입을 축하합니다.",
      newUser: newUser,
    };
  }

  // 로그인
  async login(inputEmail, inputPassword) {
    // 입력받은 이메일이 DB에 존재하는지를 확인하고, 있으면 그 유저 정보 user에 담기
    const user = await User.findOne({ email: inputEmail });
    // 입력받은 이메일과 일치하는 이메일을 가진 유저가 없다면
    if (!user) {
      return {
        status: 400,
        errMsg: "존재하지 않는 이메일입니다.",
      };
    }

    // 해당 이메일을 가진 유저가 존재하면 그 유저의 비밀번호가 일치하는지 확인
    const isPasswordCorrect = await bcrypt.compare(
      inputPassword,
      user.password
    );
    if (!isPasswordCorrect) {
      return {
        status: 400,
        errMsg: "비밀번호가 일치하지 않습니다.",
      };
    }

    // 비밀번호가 일치하면 jwt 토큰 발급
    const token = await jwt.sign(
      {
        email: user.email,
        isAdmin: user.isAdmin,
      },
      SECRET_KEY,
      {
        expiresIn: "50m",
      }
    );

    // 토큰 발급 중 에러가 발생하면 에러 메세지를 보냄.
    if (!token) {
      return {
        status: 400,
        errMsg: token,
      };
    }

    // 토큰이 정상적으로 발급되면 그 토큰을 응답으로 보냄.
    return {
      status: 200,
      message: `환영합니다 ${user.username}님!😊`,
      accesstoken: token,
    };
  }

  // 일반 회원 마이페이지
  async getMyPage(token) {
    // 토큰이 유효한지 확인
    const decodingtoken = await this.verifyToken(token);
    // 토큰이 유효하지 않다면 에러 메세지 객체 반환
    if (!decodingtoken) {
      return {
        status: 400,
        errMsg: "토큰이 유효하지 않습니다.",
      };
    }

    // 토큰이 유효하면 해당 유저의 정보를 찾기 (토큰에는 유저의 이메일 정보와 관리자인지 여부가 들어 있다.)
    const user = await User.findOne({ email: decodingtoken.email });
    // 해당 유저의 _id를 가지고 Order에서 회원이 주문한 것이 있으면 그 정보 찾기 (populate 사용!!)
    const userOrders = await Order.find({ user }).populate("user");

    // 마이페이지에 처음 접근하면 주문처리 현황이 나오는데, 이를 전달해주기 (ex) {'배송중': 1, '배송 완료': 2})
    const deliveries = {};
    for (let order of userOrders) {
      if (deliveries[order.deliveryStatus])
        deliveries[order.deliveryStatus] += 1;
      else deliveries[order.deliveryStatus] = 1;
    }

    // 마이페이지에서 사용하기 위해 유저의 정보를 결과로 전달하기
    return {
      status: 200,
      message: `안녕하세요, ${user.username}님!😀 마이페이지 입니다.`,
      user: user,
      deliveryStatus: deliveries,
    };
  }

  // 일반 회원 주문 조회 페이지 접근
  async getUserOrders(userId) {
    // string 형태의 userId를 obejctId 형태로 바꾸기
    userId = new ObjectId(userId);
    // Order 스키마에서 user의 _id가 userId와 같은 주문 찾기 (한 user의 주문이 여러개일 수 있다.)
    const userOrders = Order.find({ user: userId })
      .populate("user")
      .populate("orderProducts.products");
    // postman에서 .populate("orderProducts.products") 를 쓰면 결과가 안나오고, .populate("orderProducts.products")를 없애면 결과가 잘 나오기는 하는데
    // orderProducts 배열에서 products 부분의 값이 id 참조로 되어 있다. 아직 product 데이터를 안넣어서 그런가..?
    // 회원이 주문한 목록을 내보내기
    return userOrders;
  }

  // 비회원 마이페이지 주문번호, 비밀번호 검증하기 (테스트 해야 함...)
  async postNonMember(name, orderId, orderPassword) {
    // Orders 콜렉션에서 우선 주문자가 비회원이고 주문자가 name과 같고, orderId가 같은 data만 골라내기 (user필드가 null인 것들)
    const nonMemberOrder = await Order.findOne({
      user: null,
      orderer: name,
      orderId: new ObjectId(orderId),
    });
    return nonMemberOrder;
    // 해당 주문 번호나 이름의 비회원이 없으면 없다고 메시지 전달
    if (!nonMemberOrder.length) {
      return {
        status: 400,
        errMsg: "주문 정보가 올바르지 않습니다. 다시 입력해 주세요.",
      };
    }

    // 일치하는 데이터를 찾은 경우 거기에 해당하는 member 중 orderPassword가 Order DB에 저장된 password와 일치하는지 확인
    // Order에서 orderPassword 값은 해싱되어 저장되어 있을 것이기 때문에 bcrypt 사용!
    const isOrderPasswordSame = await bcrypt.compare(
      orderPassword,
      nonMemberOrder.orderPassword
    );
    // 비밀번호가 일치하지 않으면 주문 비밀번호가 일치하지 않는다는 알림을 보낸다.
    if (!isOrderPasswordSame) {
      return {
        status: 400,
        errMsg: "주문 비밀번호가 일치하지 않습니다.",
      };
    }

    // 다 일치하는 경우 비회원 페이지 접속 가능!
    return {
      status: 200,
      message: `${orderIdSame.orderer}님, 비회원 주문 확인이 성공적으로 완료되었습니다.`,
      nonMemberOrder,
    };
  }

  // 비회원 페이지 (비회원 주문조회 페이지) (테스트 해봐야 함)
  // (비회원 주문조회 페이지에서는 회원 마이페이지와는 다르게 접속하자마자 주문처리(배송) 현황과 주문 내역이 다 나옴.)
  async getNonMemberPage(orderId) {
    // Orders 컬렉션에서 id가 orderId인 것으로 찾으면 된다. (이미 위에서 비회원 주문자 검증을 마쳤으므로)
    const nonMemberOrder = await Order.findById(new ObjectId(orderId));
    // 이제 product에 해당 비회원이 주문한 제품의 모든 정보로 채운다.
    const fillProducts = await nonMemberOrder
      .find({})
      .populate("orderProducts.products");
    // fillProducts에는 비회원의 주문 현황과 주문 상품에 대한 정보가 모두 들어가 있고, 이를 응답으로 반환
    return {
      status: 200,
      message: `${fillProducts.orderer}님의 비회원 주문 조회 페이지입니다.`,
      nonMemberOrder: fillProducts,
    };
  }

  // 사용자 주문 취소 요청 (비회원, 회원 모두)
  async cancelOrder(orderId) {
    // 우선 string 형태의 orderId를 ObjectId 형태로 바꾸기
    orderId = new ObjectId(orderId);
    // Order 컬렉션에서 그 id에 해당하는 주문 찾기
    const findOrder = await Order.findById(orderId);
    // 해당 주문의 배송 현황이 주문 완료가 아니면 그 주문 취소 불가
    if (findOrder.deliveryStatus !== "주문 완료") {
      return {
        status: 400,
        errMsg:
          "배송 현황이 배송 준비중 단계 이상부터는 주문 취소가 불가합니다.",
      };
    }

    // 배송 현황이 주문중이면 Order 컬렉션에서 해당 order를 삭제
    await Order.findByIdAndDelete(orderId);

    // 주문 삭제에 성공하면 성공 메세지 보내기
    return {
      status: 200,
      message: "주문 취소가 성공적으로 이루어졌습니다.",
    };
  }

  // 회원 정보 변경창에 들어가면 이미 등록되어 있는 회원 정보 보여주기 (회원에만 해당, 이메일은 변경할 수 없음!)
  // 근데 이메일은 못바꿈! (고정)
  async getUserInfo(userId) {
    try {
      // User 컬렉션에서 해당하는 유저 찾기
      const user = await User.findOne({ _id: new ObjectId(userId) });
      // 비밀번호를 제외한 유저의 정보를 보내주기
      const { email, username, address, phone } = user;
      return {
        status: 200,
        message: "form에 기본적으로 넣기 위한 비밀번호를 제외한 정보들입니다.",
        userInfo: { email, username, address, phone },
      };
    } catch (err) {
      return err;
    }
  }

  // 회원 정보 수정 시 변경 상태 등록하기 (회원에만 해당)
  async updateUserInfo(userId, password, username, address, phone) {
    try {
      // 일단 비밀번호 먼저 해싱
      const hashedPassword = await bcrypt.hash(password, 5);

      // User 컬렉션에서 userId를 가진 user 찾기
      const user = await User.findById(new ObjectId(userId));
      // user에서 password, username, address, phone 값을 업데이트
      user.password = hashedPassword;
      user.username = username;
      user.address = address;
      user.phone = phone;
      // 변경된 정보를 저장
      await user.save();

      return {
        status: 200,
        message: "회원 정보 수정이 완료되었습니다.",
      };
    } catch (err) {
      return {
        status: 400,
        errMsg: "회원 정보 수정 중 오류가 발생했습니다.",
        err: err,
      };
    }
  }
}

const userService = new UserService();

export { userService };