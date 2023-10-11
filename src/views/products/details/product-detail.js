// 상품 주문 개수 up&down
const numberElement = document.querySelector(".number");
const arrowUp = document.querySelector(".arrow-up");
const arrowDown = document.querySelector(".arrow-down");

let number = 1;

function increaseNumber() {
  number++;
  numberElement.textContent = number;
}

function decreaseNumber() {
  if (number > 1) {
    number--;
    numberElement.textContent = number;
  }
}

arrowUp.addEventListener("click", increaseNumber);
arrowDown.addEventListener("click", decreaseNumber);

// 상품 데이터 불러오기
const pathSegments = window.location.pathname.split("/");
const productId = pathSegments[pathSegments.length - 1]; // 마지막 세그먼트를 가져옵니다.
let product = {};
console.log("productId:", productId);
fetch(`/api/products/${productId}`)
  .then((response) => {
    if (!response.ok) {
      throw new Error("Error");
    }
    return response.json();
  })
  .then((productData) => {
    console.log(productData);
    document.querySelector(".product-name").textContent =
      productData.productName;
    document.querySelector(".product-price").textContent = productData.price;
    document.querySelector(".products-img").src = productData.productImg;
    document.querySelector(".productsDet-img").src = productData.description;

    product = {
      productId: productData._id,
      productName: productData.productName,
      size: product.size,
      quantity: product.quantity,
      price: productData.price,
      productImg: productData.productImg,
    };
  })
  .catch((error) => {
    console.error("Error", error);
  });

const productSizeSelect = document.getElementById("product-size");

document
  .querySelector(".add-to-cart-button")
  .addEventListener("click", function () {
    product.quantity = parseInt(
      document.querySelector(".number").textContent,
      10
    );

    product.size = productSizeSelect.value;

    if (product.size === "" || product.size === null) {
      alert("상품 사이즈를 선택해주세요.");
      return;
    }

    const cart = JSON.parse(localStorage.getItem("myCart")) || [];

    // 장바구니에 같은 상품이 이미 있는지 확인합니다.
    const existingProduct = cart.find(
      (p) => p._id === product._id && p.size === product.size
    );

    if (existingProduct) {
      // 이미 있으면 수량을 업데이트합니다.
      existingProduct.quantity += product.quantity;
    } else {
      cart.push(product);
    }
    localStorage.setItem("myCart", JSON.stringify(cart));

    alert("장바구니에 추가되었습니다.");
  });

//BUY NOW 버튼 클릭 시
document.querySelector(".order-button").addEventListener("click", function () {
  const { productImg, productName, price, quantity, size } = product;

  const token = localStorage.getItem("Authorization") || "";

  product.size = productSizeSelect.value;
  if (product.size === "" || product.size === null) {
    alert("상품 사이즈를 선택해주세요.");
    return;
  }

  if (!token) {
    const orderUrl = `/order?productImg=${productImg}&productName=${productName}&price=${price}&quantity=${quantity}&size=${size}`;
    window.location.href = orderUrl;
    return;
  }

  // 토큰이 있을 경우(로그인 상태)
  fetch(`/api/products/${productId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (response.ok) {
        const cartUrl = `/cart?productImg=${productImg}&productName=${productName}&price=${price}&quantity=${quantity}&size=${size}`;
        window.location.href = cartUrl;
      }
      // 토큰 검증 실패
      else {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        window.location.href = "/login";
      }
    })
    .catch((error) => console.error("Error: ", error));
});

// 후기,문의 버튼 클릭 시 로그인 토큰 검사
document.getElementById("reviews-btn").addEventListener("click", function () {
  console.log("Reviews button clicked");
  verifyTokenAndRedirect(
    "/products/details/products-detail-form.html?type=review"
  );
});

document.getElementById("questions-btn").addEventListener("click", function () {
  verifyTokenAndRedirect(
    "/products/details/products-detail-form.html?type=question"
  );
});

function verifyTokenAndRedirect(url) {
  const token = localStorage.getItem("Authorization") || "";
  if (!token) {
    alert("로그인이 필요합니다.");
    console.log("Redirecting to login page...");
    window.location.href = "/login";
    return;
  }

  fetch(`/api/products/${productId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (response.ok) {
        window.location.href = url;
      } else {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        window.location.href = "/login";
      }
    })
    .catch((err) => console.log(err));
}

//후기,문의작성 title, author,content
function fetchReviews(productId, getAll = false) {
  fetch(`/products/${productId}/review?getAll=${getAll}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("error" + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      const tableBody = document.querySelector("#review-table tbody");
      data.forEach((review) => {
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.textContent = review.data;
        row.appendChild(dateCell);

        const idCell = document.createElement("td");
        idCell.textContent = review._id;
        row.appendChild(idCell);

        const titleCell = document.createElement("td");
        titleCell.textContent = review.title;
        row.appendChild(titleCell);

        const contentCell = document.createElement("td");
        contentCell.textContent = review.content;
        row.appendChild(contentCell);

        tableBody.appendChild(row);
      });
    })
    .catch((err) => console.error("Error", err));
}

function fetchQestion(productId, getAll = false) {
  fetch(`/products/${productId}/inquiry?getAll=${getAll}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("error " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      const tableBody = document.querySelector("#question-table tbody");
      data.forEach((review) => {
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.textContent = question.data;
        row.appendChild(dateCell);

        const idCell = document.createElement("td");
        idCell.textContent = question._id;
        row.appendChild(idCell);

        const titleCell = document.createElement("td");
        titleCell.textContent = question.title;
        row.appendChild(titleCell);

        const contentCell = document.createElement("td");
        contentCell.textContent = question.content;
        row.appendChild(contentCell);

        tableBody.appendChild(row);
      });
    })
    .catch((err) => console.error("Error", err));
}